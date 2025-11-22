import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAuth } from '@/providers/AuthProvider';
import { db } from '@/lib/firebase';

import type { BatchTrackProgress } from '@/firebase/types';

export interface BatchProgress {
  status: 'preparing' | 'processing' | 'complete' | 'error';
  trackCount: number;
  completedTracks: number;
  tracks: Record<string, BatchTrackProgress>;
}

export function useBatchProgress(batchId: string | null) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!batchId || !user) return;

    // Subscribe to batch progress updates
    // First verify ownership
    const verifyAccess = async () => {
      try {
        const batchDoc = await getDoc(doc(db, 'batches', batchId));
        if (!batchDoc.exists()) {
          throw new Error('Batch not found');
        }
        const data = batchDoc.data();
        if (data.uploadedBy !== user.uid) {
          throw new Error('Permission denied');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to verify access'));
        return false;
      }
      return true;
    };

    verifyAccess().then(hasAccess => {
      if (!hasAccess) return;
    const unsubscribe = onSnapshot(
      doc(db, 'batches', batchId),
      (doc) => {
        if (doc.exists()) {
          setProgress(doc.data() as BatchProgress);
        }
      },
      (error) => {
        console.error('Batch progress tracking error:', error);
      }
    });
    });

    return () => unsubscribe();
  }, [batchId, user]);

  return { progress, error };
}