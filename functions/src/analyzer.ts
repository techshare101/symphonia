import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const cfg = functions.config();
const ANALYZER_URL = cfg?.symphonia?.analyzer_url as string;
const ANALYZER_TOKEN = cfg?.symphonia?.analyzer_token as string;

/**
 * Validates JWT token from Cloud Run
 */
async function validateToken(token: string): Promise<boolean> {
  try {
    await admin.auth().verifyIdToken(token);
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Secure endpoint for the analyzer service
 * POST /analyzeTrack
 * Headers:
 *   Authorization: Bearer <token>
 * Body:
 *   trackId: string
 *   downloadUrl: string
 */
export const analyzeTrack = functions.https.onRequest(async (req, res) => {
  try {
    // 1. Check method
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    // 2. Validate auth token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).send('Missing authorization token');
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const isValid = await validateToken(token);
    if (!isValid) {
      res.status(403).send('Invalid token');
      return;
    }

    // 3. Validate request body
    const { trackId, downloadUrl } = req.body;
    if (!trackId || !downloadUrl) {
      res.status(400).send('Missing required fields: trackId, downloadUrl');
      return;
    }

    // 4. Call analyzer service
    console.log(`Analyzing track ${trackId}...`);
    const analyzerRes = await fetch(ANALYZER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANALYZER_TOKEN}`
      },
      body: JSON.stringify({
        track_id: trackId,
        file_url: downloadUrl
      })
    });

    if (!analyzerRes.ok) {
      throw new Error(`Analyzer error: ${analyzerRes.status} ${await analyzerRes.text()}`);
    }

    // 5. Get analysis results
    const analysis = await analyzerRes.json();

    // 6. Update Firestore
    const trackRef = admin.firestore().collection('tracks').doc(trackId);
    await trackRef.update({
      status: 'ready',
      analysis: {
        bpm: analysis.bpm,
        key: analysis.key,
        keyConfidence: analysis.key_confidence,
        energy: analysis.energy_rms,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }
    });

    // 7. Send success response
    res.json({
      status: 'success',
      trackId,
      analysis: {
        bpm: analysis.bpm,
        key: analysis.key,
        keyConfidence: analysis.key_confidence,
        energy: analysis.energy_rms
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });

    // Update track status if we have the ID
    if (req.body?.trackId) {
      try {
        const trackRef = admin.firestore().collection('tracks').doc(req.body.trackId);
        await trackRef.update({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorTimestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (dbError) {
        console.error('Error updating track status:', dbError);
      }
    }
  }
});