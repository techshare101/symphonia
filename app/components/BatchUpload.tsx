'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useBatchProgress } from '@/hooks/useBatchProgress';
import { createTrackRecord, uploadTrack, startBatchProcessing } from '@/firebase/utils';
import { BatchProgress } from './BatchProgress';

export default function BatchUpload() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const batchProgress = useBatchProgress(batchId);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
          <p className="text-slate-300">Loading batch upload...</p>
        </div>
      </div>
    );
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || !user) return;

    setUploading(true);
    try {
      const trackIds = [];
      
      // Upload files in parallel
      const uploads = Array.from(files).map(async (file) => {
        const trackId = await createTrackRecord(file.name, user.uid);
        await uploadTrack(file, user.uid, trackId);
        trackIds.push(trackId);
      });

      await Promise.all(uploads);

      // Start batch processing
      const { batchId } = await startBatchProcessing({ trackIds });
      setBatchId(batchId);

    } catch (error) {
      console.error('Batch upload error:', error);
    } finally {
      setUploading(false);
      setFiles(null);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpload} className="space-y-4">
        <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="hidden"
            id="batch-upload"
            disabled={uploading}
          />
          <label
            htmlFor="batch-upload"
            className={`block cursor-pointer text-slate-300 hover:text-white ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Drop multiple audio files here or click to select
          </label>
        </div>

        {files && (
          <div className="bg-slate-800 rounded p-4">
            <h3 className="font-medium mb-2">Selected Files ({files.length}):</h3>
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
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-4 py-2 rounded-lg w-full"
        >
          {uploading ? 'Uploading...' : 'Upload & Process Batch'}
        </button>
      </form>

      {batchProgress && (
        <BatchProgress
          progress={batchProgress}
          onClose={() => setBatchId(null)}
        />
      )}
    </div>
  );
}