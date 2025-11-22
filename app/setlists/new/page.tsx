'use client';

import { useState, useEffect, useMemo } from 'react';
import ArcSelector from '@/components/ArcSelector';
import TransitionAnalyzer from '@/components/TransitionAnalyzer';
import EnergyCurveVisualizer from '@/components/EnergyCurveVisualizer';
import { MusicalNoteIcon, QueueListIcon, ArrowDownTrayIcon, ArrowPathIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/providers/AuthProvider';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calculateTransitionScore } from '@/lib/audioAnalysis';

interface Track {
    id: string;
    title: string;
    artist?: string;
    bpm?: number;
    key?: string;
    energyCurve?: number[];
    duration?: number;
    danceability?: number;
    harmonic?: {
        key: string;
        musicalKey: string;
        confidence: number;
        compatible: string[];
    };
    mood?: {
        valence: number;
        arousal: number;
        class: string;
    };
    downloadURL?: string;
    storageUrl?: string; // Standardized field
    storagePath?: string;
    localPath?: string;
}

export default function SetlistBuilderPage() {
    const { user } = useAuth();
    const [selectedArc, setSelectedArc] = useState('heartbreak');
    const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedSetlist, setGeneratedSetlist] = useState<Track[] | null>(null);
    const [availableTracks, setAvailableTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTransitionDetails, setShowTransitionDetails] = useState<number | null>(null);

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
                    title: doc.data().title || doc.data().filename || 'Untitled'
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

    // Calculate transition scores between consecutive tracks
    const transitionScores = useMemo(() => {
        if (!generatedSetlist || generatedSetlist.length < 2) return [];

        const scores: number[] = [];
        for (let i = 0; i < generatedSetlist.length - 1; i++) {
            const track1 = generatedSetlist[i];
            const track2 = generatedSetlist[i + 1];
            const score = calculateTransitionScore(
                track1,
                track2,
                track1.bpm || 120,
                track2.bpm || 120
            );
            scores.push(score);
        }
        return scores;
    }, [generatedSetlist]);

    // Calculate overall setlist smoothness
    const overallSmoothness = useMemo(() => {
        if (transitionScores.length === 0) return 0;
        return Math.round(
            transitionScores.reduce((sum, score) => sum + score, 0) / transitionScores.length
        );
    }, [transitionScores]);

    // Generate cumulative energy curve
    const cumulativeEnergyCurve = useMemo(() => {
        if (!generatedSetlist || generatedSetlist.length === 0) return [];

        const curve: number[] = [];
        generatedSetlist.forEach(track => {
            if (track.energyCurve) {
                curve.push(...track.energyCurve);
            }
        });
        return curve;
    }, [generatedSetlist]);

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
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Get selected tracks
            const selected = availableTracks.filter(t => selectedTracks.includes(t.id));

            // Simple ordering by BPM for now (can be enhanced with arc logic)
            const ordered = [...selected].sort((a, b) => (a.bpm || 0) - (b.bpm || 0));

            setGeneratedSetlist(ordered);
            toast.success('Setlist generated!');
        } catch (error) {
            console.error('Error generating setlist:', error);
            toast.error('Failed to generate setlist');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAutoOptimize = () => {
        if (!generatedSetlist || generatedSetlist.length < 2) return;

        toast.loading('Optimizing transitions...', { id: 'optimize' });

        // Greedy algorithm: start with first track, always pick best next transition
        const optimized: Track[] = [generatedSetlist[0]];
        const remaining = [...generatedSetlist.slice(1)];

        while (remaining.length > 0) {
            const current = optimized[optimized.length - 1];
            let bestScore = -1;
            let bestIndex = 0;

            remaining.forEach((track, idx) => {
                const score = calculateTransitionScore(
                    current,
                    track,
                    current.bpm || 120,
                    track.bpm || 120
                );
                if (score > bestScore) {
                    bestScore = score;
                    bestIndex = idx;
                }
            });

            optimized.push(remaining[bestIndex]);
            remaining.splice(bestIndex, 1);
        }

        setGeneratedSetlist(optimized);
        toast.success('Setlist optimized!', { id: 'optimize' });
    };

    const handleSave = async () => {
        if (!generatedSetlist || !user) return;

        try {
            toast.loading('Saving setlist...');
            const { addDoc, serverTimestamp } = await import('firebase/firestore');

            await addDoc(collection(db, 'setlists'), {
                title: `Setlist ${new Date().toLocaleString()}`,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                trackOrder: generatedSetlist.map(t => t.id),
                arcType: selectedArc
            });

            toast.dismiss();
            toast.success('Setlist saved to library!');
        } catch (error) {
            console.error('Error saving setlist:', error);
            toast.dismiss();
            toast.error('Failed to save setlist');
        }
    };

    const handleExport = async (type: 'm3u' | 'srt') => {
        if (!generatedSetlist) return;

        try {
            toast.loading(`Exporting ${type.toUpperCase()}...`);
            const response = await fetch('/api/simulate/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tracks: generatedSetlist, type })
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `setlist.${type}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.dismiss();
            toast.success(`${type.toUpperCase()} exported!`);
        } catch (error) {
            console.error('Export error:', error);
            toast.dismiss();
            toast.error('Export failed');
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
                <p className="text-slate-400 text-lg">Construct your sonic journey with intelligent transition analysis.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Configuration (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Arc Selector Panel */}
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-lg relative z-20">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                <span className="font-mono font-bold text-cyan-400">01</span>
                            </div>
                            <h2 className="text-lg font-bold text-white">Narrative Arc</h2>
                        </div>
                        <ArcSelector selected={selectedArc} onChange={setSelectedArc} />
                    </div>

                    {/* Track Selection Panel */}
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-lg flex flex-col h-[500px] relative z-10">
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
                        <div className="space-y-6">
                            {/* Smoothness Score & Actions */}
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className={`px-6 py-4 rounded-xl border ${overallSmoothness >= 80 ? 'bg-green-500/20 border-green-500/30' :
                                            overallSmoothness >= 60 ? 'bg-yellow-500/20 border-yellow-500/30' :
                                                'bg-orange-500/20 border-orange-500/30'
                                            }`}>
                                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Overall Smoothness</div>
                                            <div className={`text-3xl font-bold ${overallSmoothness >= 80 ? 'text-green-400' :
                                                overallSmoothness >= 60 ? 'text-yellow-400' :
                                                    'text-orange-400'
                                                }`}>
                                                {overallSmoothness}%
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-slate-400">
                                                {transitionScores.filter(s => s < 50).length > 0 && (
                                                    <div className="flex items-center gap-2 text-orange-400">
                                                        <ExclamationTriangleIcon className="w-4 h-4" />
                                                        {transitionScores.filter(s => s < 50).length} problematic transition(s)
                                                    </div>
                                                )}
                                                {transitionScores.filter(s => s >= 80).length > 0 && (
                                                    <div className="text-green-400">
                                                        {transitionScores.filter(s => s >= 80).length} excellent transition(s)
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleAutoOptimize}
                                            className="btn-primary text-sm flex items-center gap-2 py-2 px-4"
                                        >
                                            <SparklesIcon className="w-4 h-4" />
                                            Auto-Optimize
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="btn-primary text-sm flex items-center gap-2 py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                                        >
                                            <QueueListIcon className="w-4 h-4" />
                                            Save to Library
                                        </button>
                                        <button
                                            onClick={() => handleExport('m3u')}
                                            className="btn-secondary text-sm flex items-center gap-2 py-2 px-4"
                                        >
                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                            Export
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Cumulative Energy Curve */}
                            {cumulativeEnergyCurve.length > 0 && (
                                <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-lg">
                                    <h3 className="text-lg font-bold text-white mb-4">Setlist Energy Flow</h3>
                                    <EnergyCurveVisualizer
                                        energyCurve={cumulativeEnergyCurve}
                                        duration={generatedSetlist.reduce((sum, t) => sum + (t.duration || 0), 0)}
                                        height={100}
                                    />
                                </div>
                            )}

                            {/* Track List with Transitions */}
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"></div>

                                <div className="relative space-y-4">
                                    {generatedSetlist.map((track, idx) => (
                                        <div key={track.id}>
                                            {/* Track */}
                                            <div className="relative pl-12 group">
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
                                                            <span className="text-purple-400 font-bold">{track.harmonic?.key || track.key || '--'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Transition Score */}
                                            {idx < generatedSetlist.length - 1 && (
                                                <div className="pl-12 py-2">
                                                    <button
                                                        onClick={() => setShowTransitionDetails(showTransitionDetails === idx ? null : idx)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${transitionScores[idx] >= 80 ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' :
                                                            transitionScores[idx] >= 60 ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' :
                                                                transitionScores[idx] >= 40 ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20' :
                                                                    'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                                                            }`}
                                                    >
                                                        <span className="text-xs text-slate-400 uppercase tracking-wider">Transition Quality</span>
                                                        <span className={`text-lg font-bold ${transitionScores[idx] >= 80 ? 'text-green-400' :
                                                            transitionScores[idx] >= 60 ? 'text-yellow-400' :
                                                                transitionScores[idx] >= 40 ? 'text-orange-400' :
                                                                    'text-red-400'
                                                            }`}>
                                                            {transitionScores[idx]}%
                                                        </span>
                                                    </button>

                                                    {showTransitionDetails === idx && (
                                                        <div className="mt-2 animate-fade-in-up">
                                                            <TransitionAnalyzer
                                                                track1={track}
                                                                track2={generatedSetlist[idx + 1]}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-500 p-12 bg-white/5 backdrop-blur-sm group hover:border-cyan-500/30 transition-colors">
                            <div className="w-24 h-24 rounded-full bg-black/40 flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 group-hover:border-cyan-500/50 transition-all duration-500 shadow-2xl">
                                <QueueListIcon className="w-10 h-10 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                            </div>
                            <p className="text-xl font-bold text-white mb-2">Ready to Arrange</p>
                            <p className="text-sm max-w-xs text-center text-slate-400">
                                Select tracks and an arc template to generate your AI-powered setlist with intelligent transition analysis.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
