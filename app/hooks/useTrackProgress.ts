import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface TrackProgress {
  stage: 'analyzing' | 'transcribing' | 'translating' | 'complete' | 'error';
  progress: number;
  error?: string;
}

interface TrackProgressState {
  progress: TrackProgress | null;
  error: Error | null;
  loading: boolean;
}

export function useTrackProgress(trackId: string | null) {
  const [state, setState] = useState<TrackProgressState>({
    progress: null,
    error: null,
    loading: true
  });

  useEffect(() => {
    if (!trackId) return;

    setState(prev => ({ ...prev, loading: true }));

    // Subscribe to progress updates
    const unsubscribe = onSnapshot(
      doc(db, 'processing', trackId),
      (doc) => {
        try {
          if (doc.exists()) {
            const data = doc.data() as TrackProgress;
            setState({
              progress: data,
              error: null,
              loading: false
            });
          } else {
            setState({
              progress: null,
              error: new Error('Track not found'),
              loading: false
            });
          }
        } catch (e) {
          const error = e instanceof Error ? e : new Error('Unknown error');
          console.error('Progress data parsing error:', error);
          setState({
            progress: null,
            error,
            loading: false
          });
        }
      },
      (error) => {
        console.error('Progress tracking error:', error);
        setState({
          progress: null,
          error,
          loading: false
        });
      }
    );

    return () => unsubscribe();
  }, [trackId]);

  return state;
}