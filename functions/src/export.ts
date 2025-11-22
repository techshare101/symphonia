import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { getSignedUrl } from './storage';

const EXPORT_SERVICE_URL = process.env.EXPORT_SERVICE_URL!;
const EXPORT_SERVICE_TOKEN = process.env.EXPORT_SERVICE_TOKEN!;

interface ExportProgress {
    setlist_id: string;
    status: string;
    progress: number;
    download_url?: string;
    error?: string;
}

// Start setlist export process
export const startSetlistExport = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated'
        );
    }

    const { setlistId, formats } = data;
    if (!setlistId || !Array.isArray(formats)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Must provide setlistId and formats array'
        );
    }

    try {
        const db = admin.firestore();

        // Get setlist tracks
        const setlistDoc = await db.collection('setlists').doc(setlistId).get();
        if (!setlistDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'Setlist not found'
            );
        }

        const setlist = setlistDoc.data()!;
        const trackIds = setlist.order;

        // Get track data in parallel
        const trackDocs = await Promise.all(
            trackIds.map(id => db.collection('tracks').doc(id).get())
        );

        // Get subtitle data in parallel
        const subtitleDocs = await Promise.all(
            trackIds.map(id => db.collection('subtitles').doc(id).get())
        );

        // Prepare track export data with signed URLs
        const tracks = await Promise.all(
            trackDocs.map(async (doc, i) => {
                const data = doc.data()!;
                const subtitles = subtitleDocs[i].exists
                    ? subtitleDocs[i].data()!.translations
                    : {};

                // Get signed URL for audio file
                const signedUrl = await getSignedUrl(
                    data.storagePath,
                    60 * 30 // 30 min expiry
                );

                return {
                    track_id: doc.id,
                    storage_url: signedUrl,
                    metadata: {
                        title: data.filename,
                        duration_sec: data.durationSec,
                        bpm: data.bpm,
                        key: data.key,
                        energy: data.energy,
                        genre: data.genre,
                        // Add enhanced features
                        mood: data.mood,
                        mixing: {
                            cue_points: data.cuePoints,
                            phrase_length: data.phraseLength,
                            compatible_keys: data.compatibleKeys
                        },
                        spectral: {
                            mfcc: data.mfcc,
                            chroma: data.chroma,
                            flux: data.spectralFlux,
                            novelty: data.spectralNovelty
                        }
                    },
                    subtitles
                };
            })
        );

        // Create export record
        const exportRef = db.collection('exports').doc();
        await exportRef.set({
            setlistId,
            createdBy: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'processing',
            progress: 0,
            formats
        });

        // Start export process
        const response = await fetch(EXPORT_SERVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${EXPORT_SERVICE_TOKEN}`
            },
            body: JSON.stringify({
                setlist_id: setlistId,
                tracks,
                formats,
                callback_url: `${process.env.FUNCTION_URL}/exportCallback`
            })
        });

        if (!response.ok) {
            throw new Error(`Export service error: ${await response.text()}`);
        }

        return { exportId: exportRef.id };

    } catch (error: any) {
        console.error('Export error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Handle export progress callbacks
export const exportCallback = functions.https.onRequest(async (req, res) => {
    try {
        const progress: ExportProgress = req.body;
        const db = admin.firestore();

        // Find export record by setlist ID
        const exportQuery = await db.collection('exports')
            .where('setlistId', '==', progress.setlist_id)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (exportQuery.empty) {
            res.status(404).send('Export record not found');
            return;
        }

        const exportRef = exportQuery.docs[0].ref;

        // Update progress
        await exportRef.update({
            status: progress.status,
            progress: progress.progress,
            downloadUrl: progress.download_url,
            error: progress.error,
            completedAt: progress.status === 'complete'
                ? admin.firestore.FieldValue.serverTimestamp()
                : null
        });

        res.json({ success: true });

    } catch (error: any) {
        console.error('Export callback error:', error);
        res.status(500).json({ error: error.message });
    }
});