import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const ANALYZER_URL = process.env.ANALYZER_URL!;
const ANALYZER_TOKEN = process.env.ANALYZER_TOKEN!;

interface MLAnalysisResult {
    genre: {
        primary: string;
        probabilities: Record<string, number>;
    };
    mood: {
        valence: number;
        arousal: number;
    };
    mix_points: Array<{
        time: number;
        quality: number;
    }>;
}

// Process ML analysis results and update Firestore
async function processMlResults(
    trackId: string,
    results: MLAnalysisResult
): Promise<void> {
    const db = admin.firestore();
    const batch = db.batch();

    // Update track document with ML results
    const trackRef = db.collection('tracks').doc(trackId);
    batch.update(trackRef, {
        genre: results.genre,
        mood: results.mood,
        mixPoints: results.mix_points,
        mlAnalyzedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update processing status
    const statusRef = db.collection('processing').doc(trackId);
    batch.update(statusRef, {
        mlStatus: 'complete',
        mlProgress: 100
    });

    await batch.commit();
}

// Trigger ML analysis after basic audio analysis
export const triggerMlAnalysis = functions
    .firestore
    .document('tracks/{trackId}')
    .onWrite(async (change, context) => {
        const trackId = context.params.trackId;
        const newData = change.after.data();
        const oldData = change.before.data();

        // Only trigger if basic analysis is complete and ML hasn't run
        if (!newData ||
            !newData.analyzed ||
            newData.mlAnalyzedAt ||
            (oldData && oldData.mlAnalyzedAt)) {
            return;
        }

        const db = admin.firestore();

        try {
            // Update status to ML processing
            await db.collection('processing').doc(trackId).update({
                mlStatus: 'processing',
                mlProgress: 0
            });

            // Get signed URL for the track
            const signedUrl = await admin.storage()
                .bucket(newData.storageBucket)
                .file(newData.storagePath)
                .getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 1000 * 60 * 30 // 30 min
                });

            // Call ML service
            const response = await fetch(`${ANALYZER_URL}/ml_analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ANALYZER_TOKEN}`
                },
                body: JSON.stringify({
                    track_id: trackId,
                    file_url: signedUrl[0],
                    base_features: {
                        bpm: newData.bpm,
                        key: newData.key,
                        energy: newData.energy
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`ML analysis failed: ${await response.text()}`);
            }

            const results = await response.json();
            await processMlResults(trackId, results);

        } catch (error) {
            console.error(`ML analysis error for track ${trackId}:`, error);

            // Update error status
            await db.collection('processing').doc(trackId).update({
                mlStatus: 'error',
                mlError: error.message
            });
        }
    });

// Queue management for batch processing
interface QueueItem {
    trackId: string;
    priority: number;
    createdAt: FirebaseFirestore.Timestamp;
}

export const manageMlQueue = functions.pubsub
    .schedule('every 1 minutes')
    .onRun(async (context) => {
        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();

        // Get queued items
        const queue = await db.collection('mlQueue')
            .where('status', '==', 'pending')
            .orderBy('priority', 'desc')
            .orderBy('createdAt', 'asc')
            .limit(5)
            .get();

        if (queue.empty) return;

        // Check current processing count
        const processing = await db.collection('mlQueue')
            .where('status', '==', 'processing')
            .get();

        if (processing.size >= 3) return; // Max concurrent jobs

        // Process next items
        const batch = db.batch();
        for (const doc of queue.docs) {
            const item = doc.data() as QueueItem;

            // Start processing
            batch.update(doc.ref, {
                status: 'processing',
                startedAt: now
            });

            // Create Cloud Task for processing
            // (implement actual Cloud Tasks integration here)
        }

        await batch.commit();
    });

// Clean up completed queue items
export const cleanupMlQueue = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
        const db = admin.firestore();
        const cutoff = admin.firestore.Timestamp.fromMillis(
            Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days
        );

        const completed = await db.collection('mlQueue')
            .where('status', 'in', ['complete', 'error'])
            .where('createdAt', '<', cutoff)
            .limit(100)
            .get();

        if (completed.empty) return;

        const batch = db.batch();
        completed.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    });