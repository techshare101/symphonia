'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import UploadProgressBar from '@/components/UploadProgressBar';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'react-hot-toast';
import { createTrackRecord, uploadTrack } from '@/firebase/utils';

interface UploadFile {
    file: File;
    id: string;
    progress: number;
    status: 'pending' | 'uploading' | 'complete' | 'error';
    error?: string;
}

export default function UploadPage() {
    const { user } = useAuth();
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [autoProcess, setAutoProcess] = useState(true);
    const [processingPublic, setProcessingPublic] = useState(false);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (!user) {
            toast.error('Please sign in to upload tracks');
            return;
        }

        const newFiles = acceptedFiles.map(file => ({
            file,
            id: Math.random().toString(36).substring(7),
            progress: 0,
            status: 'pending' as const
        }));
        setFiles(prev => [...prev, ...newFiles]);

        for (const fileObj of newFiles) {
            await startUpload(fileObj, user.uid);
        }
    }, [user]);

    const startUpload = async (fileObj: UploadFile, userId: string) => {
        try {
            const trackId = await createTrackRecord(fileObj.file.name, userId);

            setFiles(prev => prev.map(f =>
                f.id === fileObj.id ? { ...f, status: 'uploading', progress: 10 } : f
            ));

            await uploadTrack(fileObj.file, userId, trackId);

            setFiles(prev => prev.map(f =>
                f.id === fileObj.id ? { ...f, status: 'complete', progress: 100 } : f
            ));

            toast.success(`Uploaded ${fileObj.file.name}`);
        } catch (error) {
            console.error('Upload failed:', error);
            setFiles(prev => prev.map(f =>
                f.id === fileObj.id ? { ...f, status: 'error', error: 'Upload failed' } : f
            ));
            toast.error(`Failed to upload ${fileObj.file.name}`);
        }
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const processPublicFiles = async () => {
        if (!user) {
            toast.error('Please sign in first');
            return;
        }

        setProcessingPublic(true);
        try {
            toast.loading('Scanning public folder...', { id: 'process-public' });

            const response = await fetch('/api/simulate/process-public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid })
            });

            if (!response.ok) throw new Error('Scan failed');

            const { files: fileList } = await response.json();

            const { collection, addDoc, serverTimestamp, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            let processed = 0;
            for (const filename of fileList) {
                const q = query(
                    collection(db, 'tracks'),
                    where('filename', '==', filename),
                    where('uploadedBy', '==', user.uid)
                );
                const existing = await getDocs(q);

                if (!existing.empty) continue;


                // Generate enhanced analysis
                const title = filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
                const bpm = Math.floor(Math.random() * (130 - 80) + 80);
                const keys = ['C', 'Cm', 'G', 'Gm', 'D', 'Dm', 'A', 'Am', 'E', 'Em', 'B', 'Bm', 'F#m', 'C#m'];
                const key = keys[Math.floor(Math.random() * keys.length)];
                const energy = Math.random() * (1 - 0.4) + 0.4;
                const duration = 180 + Math.floor(Math.random() * 120);

                const { generateEnhancedAnalysis } = await import('@/lib/audioAnalysis');
                const analysis = generateEnhancedAnalysis(title, duration, bpm, key, energy);

                await addDoc(collection(db, 'tracks'), {
                    filename,
                    uploadedBy: user.uid,
                    status: 'complete',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    storagePath: `public/uploads/${filename}`,
                    downloadURL: `/uploads/${filename}`,
                    bpm,
                    key: analysis.harmonic.musicalKey,
                    energy,
                    duration,
                    artist: 'Unknown Artist',
                    title,
                    // Enhanced metadata
                    energyCurve: analysis.energyCurve,
                    beatGrid: analysis.beatGrid,
                    structure: analysis.structure,
                    harmonic: analysis.harmonic,
                    danceability: analysis.danceability,
                    mood: analysis.mood,
                    peakMoments: analysis.peakMoments,
                    cuePoints: analysis.cuePoints
                });
                processed++;
            }

            toast.success(`Processed ${processed} files!`, { id: 'process-public' });
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to process files', { id: 'process-public' });
        } finally {
            setProcessingPublic(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'audio/*': ['.mp3', '.wav', '.m4a', '.flac']
        }
    });

    return (
        <div className="max-w-4xl mx-auto pt-12">
            <div className="flex items-end justify-between mb-12">
                <div>
                    <h1 className="text-4xl font-bold mb-3">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-blue-400 text-glow-sm">
                            Upload Tracks
                        </span>
                    </h1>
                    <p className="text-slate-400 text-lg">Initialize the sonic analysis pipeline.</p>
                </div>
                <div className="flex items-center gap-4 bg-black/40 p-2 pr-4 rounded-xl border border-white/10 backdrop-blur-md">
                    <div className={`w-2 h-2 rounded-full ${autoProcess ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`}></div>
                    <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Auto-process</span>
                    <button
                        onClick={() => setAutoProcess(!autoProcess)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${autoProcess ? 'bg-cyan-600' : 'bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${autoProcess ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div
                {...getRootProps()}
                className={`relative group overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-500 cursor-pointer mb-12 min-h-[300px] flex flex-col items-center justify-center ${isDragActive
                    ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_50px_rgba(6,182,212,0.2)] scale-[1.02]'
                    : 'border-white/10 hover:border-cyan-500/50 hover:bg-white/5'
                    }`}
            >
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/20 rounded-full blur-[100px] transition-all duration-500 ${isDragActive ? 'opacity-100 scale-150' : 'opacity-0 scale-50'}`}></div>

                <input {...getInputProps()} />

                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-black border border-white/10 flex items-center justify-center shadow-2xl transition-all duration-500 ${isDragActive ? 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)] rotate-12' : 'group-hover:border-cyan-500/50 group-hover:-translate-y-2'}`}>
                        <CloudArrowUpIcon className={`w-10 h-10 transition-colors duration-500 ${isDragActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'}`} />
                    </div>

                    <div className="text-center">
                        <p className="text-2xl font-bold text-white mb-2 tracking-tight">
                            {isDragActive ? 'Release to Initialize' : 'Drop Audio Files Here'}
                        </p>
                        <p className="text-slate-400 font-medium">
                            MP3, WAV, M4A, FLAC <span className="text-slate-600 mx-2">|</span> Max 50MB
                        </p>
                    </div>
                </div>
            </div>

            <button
                onClick={processPublicFiles}
                disabled={processingPublic}
                className="w-full mb-8 py-4 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-lg border border-purple-500/30"
            >
                {processingPublic ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                    </>
                ) : (
                    <>
                        <CloudArrowUpIcon className="w-5 h-5" />
                        Process Files from Public Folder
                    </>
                )}
            </button>

            {files.length > 0 && (
                <div className="space-y-6 animate-fade-in-up">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="w-1 h-6 bg-cyan-500 rounded-full"></span>
                        Processing Queue
                    </h2>
                    <div className="grid gap-4">
                        {files.map(file => (
                            <UploadProgressBar
                                key={file.id}
                                file={file.file}
                                progress={file.progress}
                                error={file.error}
                                onRemove={() => removeFile(file.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
