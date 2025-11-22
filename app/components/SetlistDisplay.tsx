'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getUserTracks } from '@/firebase/utils';
import { Track } from '@/firebase/types';

export default function SetlistDisplay() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) return;

    const loadTracks = async () => {
      try {
        const userTracks = await getUserTracks(user.uid);
        setTracks(userTracks);
      } catch (error) {
        console.error('Error loading tracks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTracks();
  }, [mounted, user]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p>Loading your tracks...</p>
      </div>
    );
  }

  if (!tracks.length) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <p className="text-slate-300">
          No tracks uploaded yet. Upload some tracks to create a setlist!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tracks.map((track) => (
        <div
          key={track.id}
          className="bg-slate-800 rounded-lg p-4 flex items-center justify-between"
        >
          <div>
            <h3 className="font-medium">{track.filename}</h3>
            <p className="text-sm text-slate-400">
              BPM: {track.bpm} | Key: {track.key}
            </p>
          </div>
          <div className="text-sm text-slate-400">
            {/* Add download/preview buttons here */}
          </div>
        </div>
      ))}
    </div>
  );
}