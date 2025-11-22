import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getSignedUrl } from './storage';

const BATCH_CONTROLLER_URL = process.env.BATCH_CONTROLLER_URL!;
const BATCH_CONTROLLER_TOKEN = process.env.BATCH_CONTROLLER_TOKEN!;

// Start batch processing for multiple tracks
export const startBatchProcessing = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated'
        );
    }

    const { trackIds } = data;
    if (!Array.isArray(trackIds)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Must provide trackIds array'
        );
    }

    try {
        const db = admin.firestore();
        const batch = db.batch();

        // Create batch record
        const batchRef = db.collection('batches').doc();
        batch.set(batchRef, {
            createdBy: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'preparing',
            trackCount: trackIds.length,
            completedTracks: 0,
            tracks: trackIds.reduce((acc, id) => ({
                ...acc,
                [id]: { status: 'pending' }
            }), {})
        });

        // Initialize processing status for each track
        for (const trackId of trackIds) {
            const statusRef = db.collection('processing').doc(trackId);
            batch.set(statusRef, {
                batchId: batchRef.id,
                stage: 'queued',
                progress: 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        await batch.commit();

        // Get signed URLs for all tracks
        const tracks = await Promise.all(
            trackIds.map(async (trackId) => {
                const doc = await db.collection('tracks').doc(trackId).get();
                const data = doc.data()!;
                return {
                    track_id: trackId,
                    storage_path: data.storagePath,
                    signed_url: await getSignedUrl(
                        data.storagePath,
                        60 * 30 // 30 min expiry
                    )
                };
            })
        );

        // Start batch processing
        const response = await fetch(BATCH_CONTROLLER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BATCH_CONTROLLER_TOKEN}`
            },
            body: JSON.stringify({
                tracks,
                callback_url: `${process.env.FUNCTION_URL}/batchCallback`
            })
        });

        if (!response.ok) {
            throw new Error(`Batch controller error: ${await response.text()}`);
        }

        return { batchId: batchRef.id };

    } catch (error: any) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Callback endpoint for batch processing updates
export const batchCallback = functions.https.onRequest(async (req, res) => {
    try {
        const { service, results } = req.body;
        const db = admin.firestore();

        // Process each track result
        for (const result of results) {
            const { track_id, success, data, error } = result;

            // Update processing status
            const statusRef = db.collection('processing').doc(track_id);
            const status = await statusRef.get();
            const batchId = status.data()?.batchId;

            if (success) {
                // Update track with service results
                await db.collection('tracks').doc(track_id).update({
                    [`${service}Results`]: data,
                    [`${service}CompletedAt`]: admin.firestore.FieldValue.serverTimestamp()
                });

                // Update processing status
                await statusRef.update({
                    stage: service === 'gpt' ? 'complete' : service,
                    progress: service === 'gpt' ? 100 : service === 'whisper' ? 50 : 25
                });

                // Update batch status if GPT is complete
                if (service === 'gpt' && batchId) {
                    const batchRef = db.collection('batches').doc(batchId);
                    await batchRef.update({
                        completedTracks: admin.firestore.FieldValue.increment(1),
                        [`tracks.${track_id}.status`]: 'complete'
                    });

                    // Check if batch is complete
                    const batch = await batchRef.get();
                    const data = batch.data()!;
                    if (data.completedTracks === data.trackCount) {
                        await batchRef.update({ status: 'complete' });
                    }
                }
            } else {
                // Update error status
                await statusRef.update({
                    stage: 'error',
                    error: error
                });

                if (batchId) {
                    await db.collection('batches').doc(batchId).update({
                        [`tracks.${track_id}.status`]: 'error',
                        [`tracks.${track_id}.error`]: error
                    });
                }
            }
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Batch callback error:', error);
        res.status(500).json({ error: error.message });
    }
});