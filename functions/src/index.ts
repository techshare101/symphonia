import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { transcribeWithTimestamps } from './whisper.js';
import { translateSegmentsENtoFRES, arrangeSetlistArc } from './gpt.js';
import { formatSegmentsToSRT, secondsToSrtStamp } from './srt.js';
import { toM3U } from './setlist.js';
import { analyzeTrack } from './analyzer';

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Service endpoints
const cfg = functions.config();
const ANALYZER_URL = (cfg?.symphonia?.analyzer_url || process.env.ANALYZER_URL) as string;
const ANALYZER_TOKEN = (cfg?.symphonia?.analyzer_token || process.env.ANALYZER_TOKEN) as string;

/**
 * Helper: get signed URL for any storage path
 */
async function signedReadURL(storagePath: string, expiresMs = 15*60*1000) {
  const bucket = storage.bucket();
  const file = bucket.file(storagePath);
  const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + expiresMs });
  return url;
}

// Triggered when a track is uploaded
export const processTrack = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name; // tracks/{userId}/{filename}
  if (!filePath?.startsWith('tracks/')) return;

  const trackId = filePath.split('/').pop()?.split('.')[0];
  if (!trackId) return;

  try {
    // Update processing status
    await db.collection('processing').doc(trackId).set({
      stage: 'analyzing',
      progress: 0,
    });

    // Get signed URL for Cloud Run to fetch
    const signedUrl = await getSignedUrl(object.bucket, filePath);

    // Call analyzer
    const res = await fetch(`${ANALYZER_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANALYZER_TOKEN}`,
      },
      body: JSON.stringify({
        file_url: signedUrl,
        track_id: trackId,
        sample_rate: 22050,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Analyzer failed: ${text}`);
    }

    const analysis = await res.json();
    const audioFeatures = {
      bpm: analysis.bpm,
      key: analysis.key,
      keyConfidence: analysis.key_confidence,
      energy: analysis.energy_rms,
      durationSec: analysis.duration_sec,
    };

    // Update track metadata
    await db.collection('tracks').doc(trackId).update({
      ...audioFeatures,
      analyzed: true,
    });

    // Update processing status for transcription
    await db.collection('processing').doc(trackId).update({
      stage: 'transcribing',
      progress: 25,
    });

// Call Whisper for transcription
    const rawSegments = await transcribeWithTimestamps(signedUrl);

    // Build EN segments with SRT stamps
    const enSegments = rawSegments.map(seg => {
      const stamps = secondsToSrtStamp(seg.start, seg.end);
      return { start: stamps.start, end: stamps.end, text: seg.text };
    });

    // Store transcription
    await db.collection('lyrics').doc(trackId).set({
      segments: rawSegments,
      enSegments,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update progress
    await db.collection('processing').doc(trackId).update({
      stage: 'translating',
      progress: 50,
    });

    // Translate to FR/ES (batch)
    const tri = await translateSegmentsENtoFRES(enSegments);

    // Store translations
    await db.collection('subtitles').doc(trackId).set({
      trackId,
      content: tri,
      ownerId: object.metadata?.userId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update processing status
    await db.collection('processing').doc(trackId).update({
      stage: 'complete',
      progress: 100,
    });
  } catch (error) {
    console.error('Error processing track:', error);
    await db.collection('processing').doc(trackId).update({
      stage: 'error',
      error: error.message,
    });
  }
});

// Generate setlist from tracks
/**
 * After the analyzer sets tracks/{id}.status = "READY", run Whisper + translations,
 * then write subtitles/{id} and store .srt to Storage.
 */
export const onTrackReady_makeSubtitles = functions.firestore
  .document("tracks/{trackId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    if (before.status === "READY" || after.status !== "READY") return; // only when transitioning to READY

    const trackId = context.params.trackId as string;
    const path = after.storagePath as string;
    if (!path) return;

    // 1) Transcribe (timestamped)
    const url = await signedReadURL(path);
    const rawSegments = await transcribeWithTimestamps(url); // [{start:number,end:number,text}]

    // 2) Build EN segments with SRT stamps
    const enSegments = rawSegments.map(seg => {
      const stamps = secondsToSrtStamp(seg.start, seg.end);
      return { start: stamps.start, end: stamps.end, text: seg.text };
    });

    // 3) Translate to FR/ES (batch)
    const tri = await translateSegmentsENtoFRES(enSegments.map(s => ({
      start: s.start,
      end: s.end,
      text: s.text
    })));

    // 4) Persist subtitles (Firestore)
    const subRef = db.collection("subtitles").doc(trackId);
    await subRef.set({
      trackId,
      content: tri,
      ownerId: after.uploadedBy || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 5) Save .srt to Storage at exports/subtitles/{trackId}.srt
    const srtData = formatSegmentsToSRT(tri);
    const srtFile = storage.bucket().file(`exports/subtitles/${trackId}.srt`);
    await srtFile.save(Buffer.from(srtData, "utf-8"), { contentType: "application/x-subrip" });

    // 6) Mark done
    await change.after.ref.set({ subtitlesReady: true }, { merge: true });
  });

export const generateSetlist = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to generate setlists'
    );
  }

  const { trackIds, title } = data;
  if (!Array.isArray(trackIds) || !title) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Must provide track IDs and title'
    );
  }

  try {
    // Get track metadata
    const tracks = await Promise.all(
      trackIds.map(id => 
        db.collection('tracks').doc(id).get()
        .then(doc => ({ id, ...doc.data() }))
      )
    );

    // Default arc if not provided
    const arc = data.arc || "Heartbreak -> Reflection -> Rising Hope -> Climax -> Afterglow";
    
    // Ask GPT to arrange
    const arranged = await arrangeSetlistArc(tracks.map(t => ({
      id: t.id,
      bpm: t.bpm,
      key: t.key,
      energyRms: t.energy,
      durationSec: t.durationSec,
      title: t.filename || t.id,
      lyricThemes: t.lyricThemes || []
    })), arc);
    
    const order = arranged.order.filter(id => tracks.find(t => t.id === id));

    // Create setlist
    const setlistRef = await db.collection('setlists').add({
      title,
      arc,
      order,
      rationale: arranged.rationale,
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Generate M3U based on order
    const orderedTracks = order.map(id => tracks.find(t => t.id === id)!);
    const m3u = toM3U(orderedTracks.map(t => ({
      title: t.filename || t.id,
      path: t.storagePath,
      durationSec: t.durationSec
    })));

    // Save to Storage
    const m3uFile = storage.bucket().file(`exports/setlists/${setlistRef.id}.m3u`);
    await m3uFile.save(Buffer.from(m3u, "utf-8"), { contentType: "audio/x-mpegurl" });

    return { setlistId: setlistRef.id };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Export analyzer function
export { analyzeTrack };
