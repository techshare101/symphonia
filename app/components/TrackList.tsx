'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface Track {
  id: string;
  filename: string;
  status: string;
  downloadURL?: string;
  createdAt: any;
  size?: number;
  type?: string;
  progress?: number;
}

export default function TrackList() {
  const [user] = useAuthState(auth);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setTracks([]);
      setLoading(false);
      return;
    }

    // Subscribe to user's tracks
    const q = query(
      collection(db, 'tracks'),
      where('uploadedBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trackList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Track));
      setTracks(trackList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Status badge colors and labels
  const statusConfig: Record<string, { color: string; label: string }> = {
    uploading: { color: 'bg-yellow-500', label: 'Uploading' },
    uploaded: { color: 'bg-blue-500', label: 'Processing' },
    ready: { color: 'bg-green-500', label: 'Ready' },
    error: { color: 'bg-red-500', label: 'Error' }
  };

  if (!user) {
    return <div className="text-center p-6">Please sign in to view your tracks</div>;
  }

  if (loading) {
    return <div className="animate-pulse">Loading tracks...</div>;
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        No tracks uploaded yet. Upload your first track above!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tracks.map((track) => (
        <div
          key={track.id}
          className="bg-gray-800 rounded-lg p-4 shadow-lg transition-all hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-lg">{track.filename}</h3>
              <div className="flex items-center space-x-3 text-sm text-gray-400">
                {track.type && (
                  <span>{track.type.split('/')[1].toUpperCase()}</span>
                )}
                {track.size && (
                  <span>{Math.round(track.size / 1024 / 1024)}MB</span>
                )}
                {track.createdAt && (
                  <span>
<time dateTime={new Date(track.createdAt.seconds * 1000).toISOString()} suppressHydrationWarning>
                      {mounted ? new Date(track.createdAt.seconds * 1000).toLocaleString() : ''}
                    </time>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Status badge */}
              <span
                className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${statusConfig[track.status]?.color || 'bg-gray-500'}
                `}
              >
                {statusConfig[track.status]?.label || track.status}
              </span>

              {/* Progress bar for uploading/processing */}
              {(track.status === 'uploading' || track.status === 'uploaded') && track.progress !== undefined && (
                <div className="w-32">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${track.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Download button (only for ready tracks) */}
              {track.status === 'ready' && track.downloadURL && (
                <a
                  href={track.downloadURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400"
                >
                  Download
                </a>
              )}
            </div>
          </div>

          {/* Error message if any */}
          {track.status === 'error' && (
            <div className="mt-2 text-sm text-red-400">
              An error occurred processing this track. Please try uploading again.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}