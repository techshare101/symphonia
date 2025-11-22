'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface ExportProgressProps {
    exportId: string;
    onClose: () => void;
}

export function ExportProgress({ exportId, onClose }: ExportProgressProps) {
    const [progress, setProgress] = useState<{
        status: string;
        progress: number;
        formats: string[];
        downloadUrl?: string;
        error?: string;
    } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
      if (!mounted) return;
        // Subscribe to export progress updates
        const unsubscribe = onSnapshot(
            doc(db, 'exports', exportId),
            (doc) => {
                if (doc.exists()) {
                    setProgress(doc.data() as any);
                }
            },
            (error) => {
                console.error('Export progress error:', error);
            }
        );

        return () => unsubscribe();
    }, [exportId, mounted]);

    if (!progress) {
        return (
            <div className="bg-slate-800 rounded-lg p-6">
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-slate-700 rounded"></div>
                            <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                    Exporting Files
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
                        <div className="flex items-center space-x-2">
                            <span className="font-medium">
                                {progress.status === 'complete'
                                    ? 'Export Complete'
                                    : progress.status === 'error'
                                    ? 'Export Failed'
                                    : 'Processing...'}
                            </span>
                            <span className="text-sm text-slate-400">
<span suppressHydrationWarning>{mounted ? `${progress.progress}%` : ''}</span>
                            </span>
                        </div>
                        {progress.downloadUrl && (
                            <a
                                href={progress.downloadUrl}
                                download
                                className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span>Download</span>
                            </a>
                        )}
                    </div>

                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full ${
                                progress.status === 'error'
                                    ? 'bg-red-600'
                                    : progress.status === 'complete'
                                    ? 'bg-green-600'
                                    : 'bg-blue-600'
                            }`}
                            style={{ width: `${progress.progress}%` }}
                        />
                    </div>
                </div>

                {/* Export details */}
                <div className="text-sm space-y-2">
                    <div className="flex items-center space-x-2">
                        <span className="text-slate-400">Formats:</span>
                        <div className="space-x-2">
                            {progress.formats.map((format) => (
                                <span
                                    key={format}
                                    className="px-2 py-1 bg-slate-700 rounded text-xs"
                                >
                                    {format.toUpperCase()}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Error message */}
                {progress.error && (
                    <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded">
                        {progress.error}
                    </div>
                )}
            </div>
        </div>
    );
}