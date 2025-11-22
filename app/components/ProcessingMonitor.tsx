'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { collection, query, where, orderBy, onSnapshot, Timestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ProcessingItem {
  id: string;
  stage: string;
  progress: number;
  createdAt: Timestamp;
  trackId: string;
  error?: string;
  track?: {
    filename: string;
    uploadedBy: string;
  };
}

export default function ProcessingMonitor() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ProcessingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || authLoading) return;
    
    setLoading(true);
    // Subscribe to processing items for the current user only
    const q = query(
      collection(db, 'processing'),
      where('stage', 'not-in', ['complete', 'error']),
      where('userId', '==', user.uid),
      orderBy('stage'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        // Get all unique track IDs
        const trackIds = snapshot.docs
          .map(doc => (doc.data() as ProcessingItem).trackId)
          .filter((id): id is string => !!id);

        // Batch fetch all tracks in one go
        const trackDocs = trackIds.length > 0
? await Promise.all(trackIds.map(id => getDoc(doc(db, 'tracks', id))))
          : [];

        // Create a map of track data for quick lookup
        const trackDataMap = new Map(
          trackDocs.map(doc => [doc.id, doc.data() as ProcessingItem['track']])
        );

        const processingItems = snapshot.docs.map(doc => {
          const data = doc.data() as ProcessingItem;
          return {
            id: doc.id,
            ...data,
            track: data.trackId ? trackDataMap.get(data.trackId) : undefined
          };
        });

        setItems(processingItems);
      } catch (error) {
        console.error('Error processing items:', error);
        // You might want to show an error state here
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="animate-pulse text-center py-12">
        Loading processing queue...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No tracks currently being processed
      </div>
    );
  }

  const stageLabels: Record<string, string> = {
    analyzing: 'Audio Analysis',
    transcribing: 'Speech Recognition',
    translating: 'Translation',
    exporting: 'Export'
  };

  const stageColors: Record<string, string> = {
    analyzing: 'bg-blue-500',
    transcribing: 'bg-purple-500',
    translating: 'bg-green-500',
    exporting: 'bg-yellow-500'
  };

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-gray-800 rounded-lg p-4 shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-medium">
                {item.track?.filename || item.trackId}
              </h3>
              <p className="text-sm text-gray-400">
                {item.track?.uploadedBy}
              </p>
            </div>
            <span className={`
              px-3 py-1 rounded-full text-xs font-medium
              ${stageColors[item.stage] || 'bg-gray-500'}
            `}>
              {stageLabels[item.stage] || item.stage}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`${stageColors[item.stage] || 'bg-blue-500'} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <p className="text-xs text-right mt-1 text-gray-400">
            {item.progress}%
          </p>

          {/* Processing time */}
          <p className="text-xs text-gray-500 mt-2">
Started <time dateTime={item.createdAt.toDate().toISOString()} suppressHydrationWarning>
              {mounted ? item.createdAt.toDate().toLocaleString() : ''}
            </time>
          </p>
        </div>
      ))}
    </div>
  );
}