'use client';

import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Track {
    id: string;
    title: string;
    artist?: string;
    bpm?: number;
    key?: string;
}

interface DeckQueueProps {
    tracks: Track[];
    currentIndex: number;
    onRemoveTrack: (index: number) => void;
    onReorder?: (fromIndex: number, toIndex: number) => void;
    setlistTitle?: string;
}

export default function DeckQueue({ tracks, currentIndex, onRemoveTrack, setlistTitle }: DeckQueueProps) {
    if (tracks.length === 0) {
        return (
            <div className="w-64 bg-black/60 backdrop-blur-xl border-l border-white/10 flex flex-col h-full">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <ArrowPathIcon className="w-5 h-5 text-cyan-400" />
                        Queue
                    </h2>
                </div>
                <div className="flex-1 flex items-center justify-center text-slate-500">
                    <p className="text-sm text-center px-4">
                        Load a setlist or add tracks to start
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-64 bg-black/60 backdrop-blur-xl border-l border-white/10 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                    <ArrowPathIcon className="w-5 h-5 text-cyan-400" />
                    Queue
                </h2>
                {setlistTitle && (
                    <p className="text-xs text-slate-400 truncate">
                        {setlistTitle}
                    </p>
                )}
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <div className="space-y-2">
                    {tracks.map((track, index) => {
                        const isCurrent = index === currentIndex;
                        const isNext = index === currentIndex + 1;
                        const isPast = index < currentIndex;

                        return (
                            <div
                                key={`${track.id}-${index}`}
                                className={`p-3 rounded-lg border transition-all ${isCurrent
                                        ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                                        : isNext
                                            ? 'bg-blue-500/10 border-blue-500/30'
                                            : isPast
                                                ? 'bg-white/5 border-white/5 opacity-50'
                                                : 'bg-white/5 border-white/10'
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    {/* Position */}
                                    <span className={`text-xs font-mono font-bold shrink-0 w-6 ${isCurrent ? 'text-cyan-400' : 'text-slate-500'
                                        }`}>
                                        {(index + 1).toString().padStart(2, '0')}
                                    </span>

                                    {/* Track Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${isCurrent ? 'text-cyan-200' : 'text-white'
                                            }`}>
                                            {track.title}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate">
                                            {track.artist || 'Unknown'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                                            <span className="text-cyan-400">{track.bpm || '--'}</span>
                                            <span className="text-purple-400">{track.key || '--'}</span>
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    {!isPast && (
                                        <button
                                            onClick={() => onRemoveTrack(index)}
                                            className="p-1 hover:bg-red-500/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove from queue"
                                        >
                                            <XMarkIcon className="w-4 h-4 text-red-400" />
                                        </button>
                                    )}
                                </div>

                                {/* Status Labels */}
                                {isCurrent && (
                                    <div className="mt-2 px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs text-cyan-400 font-bold text-center">
                                        NOW PLAYING
                                    </div>
                                )}
                                {isNext && (
                                    <div className="mt-2 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400 font-bold text-center">
                                        UP NEXT
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Stats */}
            <div className="p-3 border-t border-white/10 bg-black/40">
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{currentIndex + 1} / {tracks.length}</span>
                    <span className="font-mono">{tracks.length - currentIndex - 1} remaining</span>
                </div>
            </div>
        </div>
    );
}
