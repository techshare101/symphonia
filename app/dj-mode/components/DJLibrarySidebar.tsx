'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MagnifyingGlassIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';

interface Track {
    id: string;
    title: string;
    artist?: string;
    bpm?: number;
    key?: string;
    duration?: number;
    danceability?: number;
    mood?: {
        class: string;
    };
    harmonic?: {
        key: string;
    };
    downloadURL?: string;
    storagePath?: string;
}

interface DJLibrarySidebarProps {
    userId: string;
    onLoadToDeck: (track: Track, deck: 'A' | 'B') => void;
    loadedTrackIds: { A?: string; B?: string };
}

export default function DJLibrarySidebar({ userId, onLoadToDeck, loadedTrackIds }: DJLibrarySidebarProps) {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'date' | 'bpm' | 'title'>('date');

    // Fetch tracks from Firestore
    useEffect(() => {
        async function fetchTracks() {
            if (!userId) return;

            try {
                const q = query(
                    collection(db, 'tracks'),
                    where('uploadedBy', '==', userId),
                    orderBy('createdAt', 'desc')
                );

                const snapshot = await getDocs(q);
                const fetchedTracks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    title: doc.data().title || doc.data().filename || 'Untitled'
                })) as Track[];

                setTracks(fetchedTracks);
                setFilteredTracks(fetchedTracks);
            } catch (error) {
                console.error('Error fetching tracks:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchTracks();
    }, [userId]);

    // Filter and search
    useEffect(() => {
        let result = [...tracks];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(track =>
                track.title.toLowerCase().includes(query) ||
                (track.artist && track.artist.toLowerCase().includes(query))
            );
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'bpm':
                    return (b.bpm || 0) - (a.bpm || 0);
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0; // Already sorted by date from Firestore
            }
        });

        setFilteredTracks(result);
    }, [searchQuery, sortBy, tracks]);

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isTrackLoaded = (trackId: string) => {
        return loadedTrackIds.A === trackId || loadedTrackIds.B === trackId;
    };

    const getLoadedDeck = (trackId: string): 'A' | 'B' | null => {
        if (loadedTrackIds.A === trackId) return 'A';
        if (loadedTrackIds.B === trackId) return 'B';
        return null;
    };

    return (
        <div className="w-80 bg-black/60 backdrop-blur-xl border-r border-white/10 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <MusicalNoteIcon className="w-5 h-5 text-cyan-400" />
                    Library
                </h2>

                {/* Search */}
                <div className="relative">
                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search tracks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-colors"
                    />
                </div>

                {/* Sort */}
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => setSortBy('date')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${sortBy === 'date'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                            }`}
                    >
                        Recent
                    </button>
                    <button
                        onClick={() => setSortBy('bpm')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${sortBy === 'bpm'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                            }`}
                    >
                        BPM
                    </button>
                    <button
                        onClick={() => setSortBy('title')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${sortBy === 'title'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                            }`}
                    >
                        A-Z
                    </button>
                </div>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
                    </div>
                ) : filteredTracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                        <p className="text-sm">No tracks found</p>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {filteredTracks.map(track => {
                            const loaded = isTrackLoaded(track.id);
                            const deck = getLoadedDeck(track.id);

                            return (
                                <div
                                    key={track.id}
                                    className={`group p-3 rounded-lg border transition-all ${loaded
                                            ? 'bg-cyan-500/10 border-cyan-500/30'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {/* Track Info */}
                                    <div className="mb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-white text-sm truncate">
                                                    {track.title}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate">
                                                    {track.artist || 'Unknown Artist'}
                                                </p>
                                            </div>
                                            {loaded && (
                                                <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold rounded">
                                                    DECK {deck}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex items-center gap-3 text-xs mb-2">
                                        <span className="text-cyan-400 font-mono font-bold">
                                            {track.bpm || '--'} BPM
                                        </span>
                                        <span className="text-purple-400 font-mono font-bold">
                                            {track.harmonic?.key || track.key || '--'}
                                        </span>
                                        <span className="text-slate-400 font-mono">
                                            {formatDuration(track.duration)}
                                        </span>
                                    </div>

                                    {/* Load Buttons */}
                                    {!loaded && (
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onLoadToDeck(track, 'A')}
                                                disabled={!!loadedTrackIds.A}
                                                className="flex-1 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold rounded-md hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                → DECK A
                                            </button>
                                            <button
                                                onClick={() => onLoadToDeck(track, 'B')}
                                                disabled={!!loadedTrackIds.B}
                                                className="flex-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-md hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                → DECK B
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="p-3 border-t border-white/10 bg-black/40">
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{filteredTracks.length} tracks</span>
                    <span className="font-mono">{tracks.length} total</span>
                </div>
            </div>
        </div>
    );
}
