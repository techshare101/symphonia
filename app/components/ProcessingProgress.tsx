'use client';

import { useState, useEffect } from 'react';
import { useTrackProgress } from '@/hooks/useTrackProgress';

const stageLabels = {
  analyzing: 'Analyzing audio...',
  transcribing: 'Extracting lyrics...',
  translating: 'Generating translations...',
  complete: 'Processing complete',
  error: 'Error processing track'
};

export default function ProcessingProgress({ trackId }: { trackId: string }) {
  const state = useTrackProgress(trackId);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!state?.progress) return null;

  const progress = state.progress;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {stageLabels[progress.stage]}
        </span>
        <span className="text-sm text-slate-400">
<span suppressHydrationWarning>{mounted ? `${progress.progress}%` : ''}</span>
        </span>
      </div>

      <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${
            progress.stage === 'error'
              ? 'bg-red-600'
              : progress.stage === 'complete'
              ? 'bg-green-600'
              : 'bg-blue-600'
          }`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      {progress.error && (
        <p className="mt-2 text-sm text-red-400">
          {progress.error}
        </p>
      )}

      {progress.stage === 'complete' && (
        <p className="mt-2 text-sm text-green-400">
          Ready for playback
        </p>
      )}
    </div>
  );
}