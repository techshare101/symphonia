'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useBatchProgress } from '@/hooks/useBatchProgress';
import { createTrackRecord, uploadTrack, simulateTrackAnalysis } from '@/firebase/utils';
import { BatchProgress } from './BatchProgress';
import { toast } from 'react-hot-toast';

export default function BatchUpload() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [processingPublic, setProcessingPublic] = useState(false);
  const { user } = useAuth();
  const { progress: batchProgress } = useBatchProgress(batchId);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(e.dataTransfer.files);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || !user) return;

    setUploading(true);
    try {
      const trackIds = [];

      // Upload files in parallel using real Firebase Storage
      const uploads = Array.from(files).map(async (file) => {
        // 1. Create initial record
        const trackId = await createTrackRecord(file.name, user.uid);

        // 2. Upload to Firebase Storage (User-specific path)
        await uploadTrack(file, user.uid, trackId);

        // 3. Simulate immediate analysis (Client-side update)
        await simulateTrackAnalysis(trackId);

        trackIds.push(trackId);
      });

      await Promise.all(uploads);

      toast.success('Tracks uploaded and processed successfully!');
      setFiles(null);

    } catch (error) {
      console.error('Batch upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const processPublicFiles = async () => {
    if (!user) return;

    setProcessingPublic(true);
    try {
      const response = await fetch('/api/simulate/process-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });

      if (!response.ok) throw new Error('Processing failed');

      const data = await response.json();
      toast.success(`Processed ${data.processed} files from public folder!`);
    } catch (error) {
      console.error('Process public files error:', error);
      toast.error('Failed to process public files');
    } finally {
      setProcessingPublic(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpload} className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${isDragging
            ? 'border-cyan-400 bg-cyan-500/10 scale-[1.02] shadow-[0_0_30px_rgba(6,182,212,0.2)]'
            : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="audio/wav, audio/x-wav, audio/mpeg, audio/mp3, audio/mp4, video/mp4, audio/aac, audio/m4a"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="hidden"
            id="batch-upload"
            disabled={uploading}
          />
          <label
            htmlFor="batch-upload"
            className={`block cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-white mb-2">Drop audio files here</p>
            <p className="text-sm text-slate-400">or click to browse</p>
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

        <button
          type="button"
          onClick={processPublicFiles}
          disabled={processingPublic}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 px-4 py-2 rounded-lg w-full"
        >
          {processingPublic ? 'Processing...' : 'Process Files from Public Folder'}
        </button>
      </form>

      {batchProgress && (
        <BatchProgress
          progress={batchProgress!}
          onClose={() => setBatchId(null)}
        />
      )}
    </div>
  );
}