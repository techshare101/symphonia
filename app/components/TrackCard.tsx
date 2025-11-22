'use client';

import { MusicalNoteIcon, ArrowDownTrayIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import StatusBadge, { TrackStatus } from './StatusBadge';

interface Track {
    id: string;
    title: string;
    artist?: string;
    bpm?: number;
    key?: string;
    energy?: number;
    duration?: number;
    status: TrackStatus;
    createdAt: any;
}

interface TrackCardProps {
    track: Track;
    onDelete: (id: string) => void;
    onRetry: (id: string) => void;
}

export default function TrackCard({ track, onDelete, onRetry }: TrackCardProps) {
    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="chrome-card group hover:border-cyan-500/30 transition-all duration-500">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-black border border-white/10 flex items-center justify-center group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-500">
                        <MusicalNoteIcon className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors duration-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white truncate max-w-[160px] text-lg group-hover:text-cyan-200 transition-colors" title={track.title}>
                            {track.title}
                        </h3>
                        <p className="text-sm text-slate-400 truncate max-w-[160px] font-medium">
                            {track.artist || 'Unknown Artist'}
                        </p>
                    </div>
                </div>
                <StatusBadge status={track.status} />
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="text-center p-2 rounded-lg bg-black/40 border border-white/5 group-hover:border-white/10 transition-colors">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">BPM</div>
                    <div className="font-mono text-sm text-cyan-400 font-bold text-glow-sm">{track.bpm || '--'}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-black/40 border border-white/5 group-hover:border-white/10 transition-colors">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Key</div>
                    <div className="font-mono text-sm text-purple-400 font-bold text-glow-sm">{track.key || '--'}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-black/40 border border-white/5 group-hover:border-white/10 transition-colors">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Energy</div>
                    <div className="font-mono text-sm text-yellow-400 font-bold text-glow-sm">{track.energy ? Math.round(track.energy * 100) + '%' : '--'}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-black/40 border border-white/5 group-hover:border-white/10 transition-colors">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Time</div>
                    <div className="font-mono text-sm text-slate-300 font-bold">{formatDuration(track.duration)}</div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex gap-2">
                    {track.status === 'complete' && (
                        <>
                            <button
                                className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors border border-transparent hover:border-white/10"
                                title="Download SRT"
                            >
                                SRT
                            </button>
                            <button
                                className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors border border-transparent hover:border-white/10"
                                title="Download M3U"
                            >
                                M3U
                            </button>
                        </>
                    )}
                </div>

                <div className="flex gap-2">
                    {track.status === 'error' && (
                        <button
                            onClick={() => onRetry(track.id)}
                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                            title="Retry Analysis"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(track.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Track"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
