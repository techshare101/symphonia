'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

// Helper functions for track upload
const createTrackRecord = async (filename: string, userId: string) => {
  const trackRef = await addDoc(collection(db, 'tracks'), {
    filename,
    uploadedBy: userId,
    status: 'uploading',
    createdAt: serverTimestamp(),
  });
  return trackRef.id;
};

const uploadTrack = async (file: File, userId: string, trackId: string) => {
  const storage = getStorage();
  const storageRef = ref(storage, `tracks/${userId}/${trackId}/${file.name}`);
  
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        console.error('Upload error:', error);
        reject(error);
      },
      () => {
        resolve(trackId);
      }
    );
  });
};

export default function UploadForm() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [user] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<{ [key: string]: number }>({}); // Moved to top level

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
        <p className="text-slate-300">Loading upload form...</p>
      </div>
    );
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || !user) return;

    setUploading(true);
    try {
      const uploads = Array.from(files).map(async (file) => {
        try {
          // Create track record first
          const trackId = await createTrackRecord(file.name, user.uid);
          
          // Then upload file to storage with trackId in metadata
          await uploadTrack(file, user.uid, trackId);
          
          return trackId;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          throw error;
        }
      });

      // Wait for all uploads to complete
      const trackIds = await Promise.all(uploads);
      console.log('Uploaded tracks:', trackIds);

    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setFiles(null);
      setProgress({});
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
        <input
          type="file"
          accept="audio/*"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="hidden"
          id="track-upload"
        />
        <label
          htmlFor="track-upload"
          className="block cursor-pointer text-slate-300 hover:text-white"
        >
          Drop audio files here or click to select
        </label>
      </div>

      {files && (
        <div className="bg-slate-800 rounded p-4">
          <h3 className="font-medium mb-2">Selected Files:</h3>
          <ul className="space-y-1">
            {Array.from(files).map((file) => (
              <li key={file.name} className="text-sm text-slate-300">
                {file.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={!files || uploading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-4 py-2 rounded-lg"
      >
        {uploading ? 'Uploading...' : 'Upload Tracks'}
      </button>
    </form>
  );
}