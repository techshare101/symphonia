import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, serverTimestamp, type DocumentData, query, where, getDocs, orderBy } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';

export async function createTrackRecord(filename: string, userId: string) {
  try {
    const trackRef = await addDoc(collection(db, 'tracks'), {
      filename,
      uploadedBy: userId,
      status: 'uploading',
      createdAt: serverTimestamp(),
      storagePath: `tracks/${userId}/${filename}`
    });
    return trackRef.id;
  } catch (error) {
    console.error('Error creating track record:', error);
    throw error;
  }
}

export async function uploadTrack(file: File, userId: string, trackId: string) {
  try {
    // Create storage reference with user ID in path
    const storageRef = ref(storage, `tracks/${userId}/${file.name}`);

    // Upload file with metadata
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        originalName: file.name,
        trackId
      }
    });

    // Wait for upload to complete
    await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        // Progress handler
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload progress:', progress);
        },
        // Error handler
        reject,
        // Complete handler
        () => resolve(undefined)
      );
    });

    // Get download URL
    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

    // Update Firestore record with download URL and status
    const trackRef = doc(db, 'tracks', trackId);
    await updateDoc(trackRef, {
      downloadURL,
      status: 'uploaded',
      size: file.size,
      type: file.type,
      updatedAt: serverTimestamp()
    });

    return downloadURL;
  } catch (error) {
    console.error('Error uploading track:', error);
    throw error;
  }
}

export async function getUserTracks(userId: string) {
  try {
    const tracksQuery = query(
      collection(db, 'tracks'),
      where('uploadedBy', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(tracksQuery);
    return snapshot.docs.map(docSnapshot => {
      const data: any = docSnapshot.data();
      return {
        id: docSnapshot.id,
        filename: data?.filename ?? docSnapshot.id,
        bpm: typeof data?.bpm === 'number' ? data.bpm : undefined,
        key: typeof data?.key === 'string' ? data.key : undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching user tracks:', error);
    throw error;
  }
}

interface BatchProcessingParams {
  trackIds: string[];
}

export async function startBatchProcessing({ trackIds }: BatchProcessingParams) {
  // Note: This should be called from a Cloud Function
  // For now, we'll just return a mock response
  return {
    batchId: 'mock-batch-id'
  };
}

export async function simulateTrackAnalysis(trackId: string) {
  try {
    const trackRef = doc(db, 'tracks', trackId);

    // Get track data to use for analysis
    const trackSnap = await import('firebase/firestore').then(m => m.getDoc(trackRef));
    const trackData = trackSnap.data();
    const title = trackData?.title || trackData?.filename || 'Unknown Track';

    // Generate basic parameters
    const bpm = Math.floor(Math.random() * (130 - 80) + 80);
    const keys = ['C', 'Cm', 'G', 'Gm', 'D', 'Dm', 'A', 'Am', 'E', 'Em', 'B', 'Bm', 'F#m', 'C#m'];
    const key = keys[Math.floor(Math.random() * keys.length)];
    const energy = Math.random() * (1 - 0.4) + 0.4;
    const duration = 180 + Math.floor(Math.random() * 120);

    // Generate enhanced analysis using the new engine
    const { generateEnhancedAnalysis } = await import('@/lib/audioAnalysis');
    const analysis = generateEnhancedAnalysis(title, duration, bpm, key, energy);

    await updateDoc(trackRef, {
      status: 'complete',
      bpm,
      key: analysis.harmonic.musicalKey,
      energy,
      duration,
      analyzedAt: serverTimestamp(),

      // Enhanced metadata
      energyCurve: analysis.energyCurve,
      beatGrid: analysis.beatGrid,
      structure: analysis.structure,
      harmonic: analysis.harmonic,
      danceability: analysis.danceability,
      mood: analysis.mood,
      peakMoments: analysis.peakMoments,
      cuePoints: analysis.cuePoints
    });
  } catch (error) {
    console.error('Error simulating analysis:', error);
    throw error;
  }
}
