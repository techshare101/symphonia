'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { XMarkIcon, QueueListIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface Track {
    id: string;
    title: string;
    artist?: string;
    bpm?: number;
    key?: string;
}

interface Setlist {
    id: string;
    title: string;
    arcType?: string;
    trackOrder: string[];
    createdAt: any;
}

interface SetlistLoaderProps {
    userId: string;
    onLoadSetlist: (tracks: Track[], setlistInfo: { id: string; title: string; arcType?: string }) => void;
    onClose: () => void;
}

export default function SetlistLoader({ userId, onLoadSetlist, onClose }: SetlistLoaderProps) {
    const [setlists, setSetlists] = useState<Setlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSetlist, setLoadingSetlist] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSetlists() {
            if (!userId) return;

            try {
                const q = query(
                    collection(db, 'setlists'),
                    where('createdBy', '==', userId),
                    orderBy('createdAt', 'desc')
                );

                const snapshot = await getDocs(q);
                const fetchedSetlists = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Setlist[];

                setSetlists(fetchedSetlists);
            } catch (error) {
                console.error('Error fetching setlists:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchSetlists();
    }, [userId]);

    const handleLoadSetlist = async (setlist: Setlist) => {
        setLoadingSetlist(setlist.id);

        try {
            // Fetch all tracks in the setlist
            const trackPromises = setlist.trackOrder.map(async (trackId) => {
                const trackDoc = await getDoc(doc(db, 'tracks', trackId));
                if (trackDoc.exists()) {
                    return {
                        id: trackDoc.id,
                        ...trackDoc.data(),
                        title: trackDoc.data().title || trackDoc.data().filename || 'Untitled'
                    } as Track;
                }
                return null;
            });

            const tracks = (await Promise.all(trackPromises)).filter(t => t !== null) as Track[];

            onLoadSetlist(tracks, {
                id: setlist.id,
                title: setlist.title,
                arcType: setlist.arcType
            });

            onClose();
        } catch (error) {
            console.error('Error loading setlist:', error);
        } finally {
            setLoadingSetlist(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <QueueListIcon className="w-7 h-7 text-cyan-400" />
                            Load Setlist
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Choose a setlist to load into DJ Mode</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Setlist List */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
                        </div>
                    ) : setlists.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                            <QueueListIcon className="w-12 h-12 mb-3 opacity-50" />
                            <p className="text-sm">No setlists found</p>
                            <p className="text-xs mt-1">Create a setlist in Setlist Builder first</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {setlists.map(setlist => (
                                <div
                                    key={setlist.id}
                                    className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-cyan-500/30 transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-white mb-1 truncate">
                                                {setlist.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                                {setlist.arcType && (
                                                    <span className="flex items-center gap-1">
                                                        <SparklesIcon className="w-4 h-4" />
                                                        {setlist.arcType}
                                                    </span>
                                                )}
                                                <span className="font-mono">
                                                    {setlist.trackOrder.length} tracks
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleLoadSetlist(setlist)}
                                            disabled={loadingSetlist === setlist.id}
                                            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-bold rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                                        >
                                            {loadingSetlist === setlist.id ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    Load Setlist
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
