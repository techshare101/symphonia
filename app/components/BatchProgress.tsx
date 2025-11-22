'use client';

import { useState, useEffect, useMemo } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ProcessingStage } from '@/firebase/types';

interface BatchTrackProgress {
  id: string;
  filename: string;
  stage: ProcessingStage;
  progress: number;
  error?: string;
}

interface BatchProgressProps {
  progress: {
    status: 'preparing' | 'processing' | 'complete' | 'error';
    trackCount: number;
    completedTracks: number;
    tracks: Record<string, BatchTrackProgress>;
  };
  onClose: () => void;
}

const stageColors = {
  queued: 'bg-slate-600',
  analyzing: 'bg-blue-600',
  transcribing: 'bg-indigo-600',
  translating: 'bg-violet-600',
  complete: 'bg-green-600',
  error: 'bg-red-600'
};

const stageLabels = {
  queued: 'Queued',
  analyzing: 'Analyzing audio...',
  transcribing: 'Extracting lyrics...',
  translating: 'Generating translations...',
  complete: 'Complete',
  error: 'Error'
};

export function BatchProgress({ progress, onClose }: BatchProgressProps) {
  const [mounted, setMounted] = useState(false);

  // Memoize calculations
  const { totalProgress, sortedTracks } = useMemo(() => {
    const totalProgress = Math.round(
      (progress.completedTracks / progress.trackCount) * 100
    );

    const sortedTracks = Object.entries(progress.tracks)
      .sort(([, a], [, b]) => {
        // Sort by stage priority and then by progress
        const stagePriority = {
          error: 0,
          queued: 1,
          analyzing: 2,
          transcribing: 3,
          translating: 4,
          complete: 5
        };
        const priorityDiff = (stagePriority[b.stage] || 0) - (stagePriority[a.stage] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return b.progress - a.progress;
      });

    return { totalProgress, sortedTracks };
  }, [progress]);
  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Processing {progress.trackCount} Tracks
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Overall progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Overall Progress: {totalProgress}%
            </span>
            <span className="text-sm text-slate-400">
              {progress.completedTracks} / {progress.trackCount} complete
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-blue-600"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {/* Track list */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {sortedTracks.map(([id, track]) => (
            <div key={id} className="bg-slate-900 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium truncate">
                  {track.filename}
                </span>
                <span className="text-sm text-slate-400">
                  {track.progress}%
                </span>
              </div>

              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full ${stageColors[track.stage]}`}
                  style={{ width: `${track.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  {stageLabels[track.stage]}
                </span>
                {track.error && (
                  <span className="text-red-400">
                    {track.error}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}