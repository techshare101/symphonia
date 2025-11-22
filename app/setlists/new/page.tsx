'use client';

import { useState, useEffect } from 'react';
import ArcSelector from '@/components/ArcSelector';
import { MusicalNoteIcon, QueueListIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/providers/AuthProvider';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Track {
    id: string;
    title: string;
    artist?: string;
    bpm?: number;
    key?: string;
}

export default function SetlistBuilderPage() {
    const { user } = useAuth();
    const [selectedArc, setSelectedArc] = useState('heartbreak');
    const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedSetlist, setGeneratedSetlist] = useState<Track[] | null>(null);
    const [availableTracks, setAvailableTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTracks() {
            if (!user) return;
            try {
                const q = query(
                    collection(db, 'tracks'),
                    where('uploadedBy', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                const tracks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    title: doc.data().filename || 'Untitled'
                })) as Track[];
                setAvailableTracks(tracks);
            } catch (error) {
                console.error('Error fetching tracks:', error);
                toast.error('Failed to load tracks');
            } finally {
                setLoading(false);
            }
        }
        fetchTracks();
    }, [user]);

    const toggleTrack = (id: string) => {
        setSelectedTracks(prev =>
            prev.includes(id)
                ? prev.filter(t => t !== id)
                : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        if (selectedTracks.length < 2) {
            toast.error('Please select at least 2 tracks');
            return;
        }

        setIsGenerating(true);

        try {
            // TODO: Call actual Cloud Function here
            // const generateSetlist = httpsCallable(functions, 'generateSetlist');
            // const result = await generateSetlist({ trackIds: selectedTracks, arc: selectedArc });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock result - just shuffle selected tracks
            const result = availableTracks
                .filter(t => selectedTracks.includes(t.id))
                .sort(() => Math.random() - 0.5);

            setGeneratedSetlist(result);
            toast.success('Setlist generated!');
        } catch (error) {
            console.error('Error generating setlist:', error);
            toast.error('Failed to generate setlist');
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pt-8">
            <div className="mb-10">
                <h1 className="text-4xl font-bold mb-3">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-blue-400 text-glow-sm">
                        Setlist Builder
                    </span>
                </h1>
                <p className="text-slate-400 text-lg">Construct your sonic journey. Select tracks and define the emotional arc.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Configuration (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Arc Selector Panel */}
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                <span className="font-mono font-bold text-cyan-400">01</span>
                            </div>
                            <h2 className="text-lg font-bold text-white">Narrative Arc</h2>
                        </div>
                        <ArcSelector selected={selectedArc} onChange={setSelectedArc} />
                    </div>

                    {/* Track Selection Panel */}
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-lg flex flex-col h-[500px]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                    <span className="font-mono font-bold text-cyan-400">02</span>
                                </div>
                                <h2 className="text-lg font-bold text-white">Select Tracks</h2>
                            </div>
                            <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                                {selectedTracks.length} SELECTED
                            </span>
                        </div>

                        {availableTracks.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-xl">
                                <p className="text-sm">No tracks found.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                {availableTracks.map(track => (
                                    <div
                                        key={track.id}
                                        onClick={() => toggleTrack(track.id)}
                                        className={`group p-3 rounded-xl cursor-pointer border transition-all duration-200 relative overflow-hidden ${selectedTracks.includes(track.id)
                                            ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                            : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="min-w-0">
                                                <p className={`font-bold truncate text-sm ${selectedTracks.includes(track.id) ? 'text-cyan-300' : 'text-slate-200'
                                                    }`}>
                                                    {track.title}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate font-mono mt-0.5">{track.artist || 'Unknown Artist'}</p>
                                            </div>
                                            {selectedTracks.includes(track.id) && (
                                                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] shrink-0" />
                                            )}
                                        </div>
                                        {/* Selection Glow Background */}
                                        {selectedTracks.includes(track.id) && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent pointer-events-none" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || selectedTracks.length < 2}
                        className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-lg ${isGenerating || selectedTracks.length < 2
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/30 shadow-cyan-900/20 hover:shadow-cyan-500/20 hover:scale-[1.02]'
                            }`}
                    >
                        {isGenerating ? (
                            <>
                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                <span className="text-glow-sm">Processing...</span>
                            </>
                        ) : (
                            <>
                                <QueueListIcon className="w-5 h-5" />
                                <span className="text-glow-sm">Initialize Generation</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column: Results (8 cols) */}
                <div className="lg:col-span-8 h-full">
                    {generatedSetlist ? (
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl h-full relative overflow-hidden">
                            {/* Background Grid */}
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"></div>

                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <span className="w-2 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full"></span>
                                        Generated Flight Path
                                    </h2>
                                    <p className="text-slate-400 text-sm ml-5 mt-1">Optimized for: <span className="text-cyan-400 font-medium">{selectedArc}</span></p>
                                </div>
                                <div className="flex gap-3">
                                    <button className="btn-secondary text-xs flex items-center gap-2 py-2 px-4">
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                        Export .M3U
                                    </button>
                                    <button className="btn-secondary text-xs flex items-center gap-2 py-2 px-4">
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                        Export .SRT
                                    </button>
                                </div>
                            </div>

                            <div className="relative space-y-6 pl-4 pr-2">
                                {/* Connecting Line */}
                                <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-gradient-to-b from-cyan-500 via-blue-500 to-purple-500 opacity-30" />

                                {generatedSetlist.map((track, idx) => (
                                    <div key={track.id} className="relative pl-12 group">
                                        {/* Node Point */}
                                        <div className="absolute left-[13px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black border-2 border-cyan-500 z-10 group-hover:scale-125 group-hover:bg-cyan-400 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />

                                        <div className="bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/5 flex items-center justify-between group-hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-sm">
                                            <div className="flex items-center gap-5">
                                                <span className="text-slate-600 font-mono text-sm w-6 font-bold group-hover:text-cyan-400 transition-colors">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </span>
                                                <div>
                                                    <p className="font-bold text-white text-lg tracking-tight group-hover:text-cyan-200 transition-colors">{track.title}</p>
                                                    <p className="text-sm text-slate-400 font-medium">{track.artist || 'Unknown Artist'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 text-sm font-mono">
                                                <div className="text-right">
                                                    <span className="block text-xs text-slate-500 uppercase tracking-wider">BPM</span>
                                                    <span className="text-cyan-400 font-bold">{track.bpm || '--'}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-xs text-slate-500 uppercase tracking-wider">KEY</span>
                                                    <span className="text-purple-400 font-bold">{track.key || '--'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-500 p-12 bg-white/5 backdrop-blur-sm group hover:border-cyan-500/30 transition-colors">
                            <div className="w-24 h-24 rounded-full bg-black/40 flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 group-hover:border-cyan-500/50 transition-all duration-500 shadow-2xl">
                                <QueueListIcon className="w-10 h-10 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                            </div>
                            <p className="text-xl font-bold text-white mb-2">Ready to Arrange</p>
                            <p className="text-sm max-w-xs text-center text-slate-400">
                                Select tracks and an arc template to generate your AI-powered setlist.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
