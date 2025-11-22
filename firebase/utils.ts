import { db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { Track, ProcessingStatus, Subtitle, Setlist } from './types';

// Upload track to Firebase Storage
export const uploadTrack = async (file: File, userId: string): Promise<string> => {
  const storageRef = ref(storage, `tracks/${userId}/${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

// Create track record in Firestore
export const createTrackRecord = async (
  filename: string, 
  userId: string
): Promise<string> => {
  const track: Omit<Track, 'id'> = {
    filename,
    bpm: 0,
    key: '',
    energy: 0,
    uploadedBy: userId,
    createdAt: serverTimestamp() as any
  };

  const docRef = await addDoc(collection(db, 'tracks'), track);
  return docRef.id;
};

// Update track metadata
export const updateTrackMetadata = async (
  trackId: string,
  metadata: Partial<Track>
) => {
  const trackRef = doc(db, 'tracks', trackId);
  await updateDoc(trackRef, metadata);
};

// Update processing status
export const updateProcessingStatus = async (
  trackId: string,
  status: Partial<ProcessingStatus>
) => {
  const statusRef = doc(db, 'processing', trackId);
  await updateDoc(statusRef, status);
};

// Save subtitles
export const saveSubtitles = async (subtitles: Subtitle) => {
  await addDoc(collection(db, 'subtitles'), subtitles);
};

// Create setlist
export const createSetlist = async (
  title: string,
  trackIds: string[],
  userId: string
): Promise<string> => {
  const setlist: Omit<Setlist, 'id'> = {
    title,
    order: trackIds,
    createdBy: userId,
    createdAt: serverTimestamp() as any
  };

  const docRef = await addDoc(collection(db, 'setlists'), setlist);
  return docRef.id;
};

// Get user's tracks
export const getUserTracks = async (userId: string): Promise<Track[]> => {
  const q = query(
    collection(db, 'tracks'),
    where('uploadedBy', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
    id: doc.id,
    ...doc.data()
  })) as Track[];
};