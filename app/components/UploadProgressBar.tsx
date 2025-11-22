'use client';

import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface UploadProgressBarProps {
    file: File;
    progress: number;
    error?: string;
    onRemove: () => void;
}

export default function UploadProgressBar({ file, progress, error, onRemove }: UploadProgressBarProps) {
    return (
        <div className="bg-black/40 rounded-xl p-4 border border-white/10 backdrop-blur-md shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center shrink-0 shadow-inner shadow-white/5">
                        <span className="text-[10px] font-bold text-cyan-400 tracking-wider">
                            {file.name.split('.').pop()?.toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate tracking-wide">
                            {file.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                    </div>
                </div>

                <button
                    onClick={onRemove}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>

            {error ? (
                <p className="text-xs text-red-400 font-medium bg-red-500/10 px-2 py-1 rounded border border-red-500/20 inline-block">{error}</p>
            ) : (
                <div className="relative h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                    <div
                        className={`absolute top-0 left-0 h-full transition-all duration-300 ${progress === 100
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_10px_rgba(74,222,128,0.5)]'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                            }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}
