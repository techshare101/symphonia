'use client';

import { useState, useEffect, useRef } from 'react';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon, SpeakerWaveIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@/providers/AuthProvider';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface Track {
    id: string;
    title: string;
    artist?: string;
    bpm?: number;
    key?: string;
    duration?: number;
    downloadURL?: string;
    storagePath?: string;
    energyCurve?: number[];
    beatGrid?: { time: number; confidence: number }[];
    structure?: {
        intro?: { start: number; end: number };
        drop?: number;
        outro?: { start: number; end: number };
        breakdowns?: { start: number; end: number }[];
    };
    cuePoints?: {
        start: number;
        mixIn: number;
        mixOut: number;
        end: number;
    };
    harmonic?: {
        key: string;
        musicalKey: string;
    };
}

export default function DJModePage() {
    const { user } = useAuth();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [nextTrack, setNextTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [currentTime, setCurrentTime] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showBeatGrid, setShowBeatGrid] = useState(true);
    const [showCuePoints, setShowCuePoints] = useState(true);
    const [showStructure, setShowStructure] = useState(true);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Fetch tracks
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
                const fetchedTracks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    title: doc.data().title || doc.data().filename || 'Untitled'
                })) as Track[];

                setTracks(fetchedTracks);
                if (fetchedTracks.length > 0) {
                    setCurrentTrack(fetchedTracks[0]);
                    if (fetchedTracks.length > 1) {
                        setNextTrack(fetchedTracks[1]);
                    }
                }
            } catch (error) {
                console.error('Error fetching tracks:', error);
                toast.error('Failed to load tracks');
            } finally {
                setLoading(false);
            }
        }
        fetchTracks();
    }, [user]);

    // Audio playback
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            // Auto-advance to next track
            if (nextTrack) {
                const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
                setCurrentTrack(nextTrack);
                if (currentIndex + 2 < tracks.length) {
                    setNextTrack(tracks[currentIndex + 2]);
                } else {
                    setNextTrack(null);
                }
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [currentTrack, nextTrack, tracks]);

    // Waveform + Beat Grid + Cue Points visualization
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !currentTrack) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const duration = currentTrack.duration || 240;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw structure sections (intro/outro/breakdowns)
        if (showStructure && currentTrack.structure) {
            ctx.globalAlpha = 0.15;

            // Intro
            if (currentTrack.structure.intro) {
                const introEnd = (currentTrack.structure.intro.end / duration) * width;
                ctx.fillStyle = '#06b6d4'; // cyan
                ctx.fillRect(0, 0, introEnd, height);
            }

            // Outro
            if (currentTrack.structure.outro) {
                const outroStart = (currentTrack.structure.outro.start / duration) * width;
                ctx.fillStyle = '#8b5cf6'; // purple
                ctx.fillRect(outroStart, 0, width - outroStart, height);
            }

            // Breakdowns
            if (currentTrack.structure.breakdowns) {
                ctx.fillStyle = '#f59e0b'; // amber
                currentTrack.structure.breakdowns.forEach(breakdown => {
                    const start = (breakdown.start / duration) * width;
                    const end = (breakdown.end / duration) * width;
                    ctx.fillRect(start, 0, end - start, height);
                });
            }

            ctx.globalAlpha = 1;
        }

        // Draw energy curve as waveform
        if (currentTrack.energyCurve) {
            ctx.beginPath();
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;

            currentTrack.energyCurve.forEach((energy, i) => {
                const x = (i / (currentTrack.energyCurve!.length - 1)) * width;
                const waveHeight = (energy / 100) * height * 0.6;
                const y = (height - waveHeight) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y + waveHeight / 2);
                } else {
                    ctx.lineTo(x, y + waveHeight / 2);
                }
            });

            ctx.stroke();

            // Fill area under curve
            ctx.lineTo(width, height / 2);
            ctx.lineTo(0, height / 2);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
            gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.1)');
            gradient.addColorStop(1, 'rgba(6, 182, 212, 0.3)');
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Draw beat grid
        if (showBeatGrid && currentTrack.beatGrid) {
            currentTrack.beatGrid.forEach(beat => {
                const x = (beat.time / duration) * width;
                const alpha = beat.confidence * 0.5;

                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 4]);
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            });
            ctx.setLineDash([]);
        }

        // Draw cue points
        if (showCuePoints && currentTrack.cuePoints) {
            const cuePoints = [
                { time: currentTrack.cuePoints.mixIn, color: '#10b981', label: 'MIX IN' },
                { time: currentTrack.cuePoints.mixOut, color: '#ef4444', label: 'MIX OUT' }
            ];

            cuePoints.forEach(cue => {
                const x = (cue.time / duration) * width;

                // Vertical line
                ctx.strokeStyle = cue.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();

                // Label
                ctx.fillStyle = cue.color;
                ctx.font = 'bold 10px monospace';
                ctx.fillText(cue.label, x + 5, 15);

                // Marker dot
                ctx.beginPath();
                ctx.arc(x, height - 10, 5, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Draw drop marker
        if (currentTrack.structure?.drop) {
            const dropX = (currentTrack.structure.drop / duration) * width;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(dropX, 0);
            ctx.lineTo(dropX, height);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('DROP', dropX + 5, 30);
        }

        // Draw playhead
        const playheadX = (currentTime / duration) * width;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();

        // Playhead time
        const minutes = Math.floor(currentTime / 60);
        const seconds = Math.floor(currentTime % 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, playheadX + 5, height - 10);

    }, [currentTrack, currentTime, showBeatGrid, showCuePoints, showStructure]);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const skipToNext = () => {
        if (!nextTrack) return;
        const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id);
        setCurrentTrack(nextTrack);
        if (currentIndex + 2 < tracks.length) {
            setNextTrack(tracks[currentIndex + 2]);
        } else {
            setNextTrack(null);
        }
        setCurrentTime(0);
        setIsPlaying(false);
    };

    const skipToPrevious = () => {
        const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id);
        if (currentIndex > 0) {
            setCurrentTrack(tracks[currentIndex - 1]);
            if (currentIndex > 1) {
                setNextTrack(tracks[currentIndex]);
            }
            setCurrentTime(0);
            setIsPlaying(false);
        }
    };

    const jumpToCue = (cueTime: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = cueTime;
        setCurrentTime(cueTime);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <ArrowPathIcon className="w-12 h-12 text-cyan-400 animate-spin" />
            </div>
        );
    }

    if (!currentTrack) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-2xl text-white mb-2">No tracks available</p>
                    <p className="text-slate-400">Upload some tracks to use DJ Mode</p>
                </div>
            </div>
        );
    }

    const audioSrc = currentTrack.downloadURL || (currentTrack.storagePath ? `/uploads/${currentTrack.storagePath.split('/').pop()}` : '');

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Hidden audio element */}
            <audio
                ref={audioRef}
                src={audioSrc}
                volume={volume}
            />

            {/* Top Bar */}
            <div className="p-6 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/10">
                <h1 className="text-2xl font-bold text-white tracking-widest uppercase">
                    <span className="text-cyan-400">DJ</span> Mode
                </h1>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold animate-pulse">
                        LIVE
                    </div>
                    <div className="text-slate-400 font-mono">{currentTrack.bpm || '--'} BPM</div>
                    <div className="text-purple-400 font-mono">{currentTrack.harmonic?.key || currentTrack.key || '--'}</div>
                </div>
            </div>

            {/* Main Visualizer Area */}
            <div className="flex-1 relative flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>

                {/* Current Track Info */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center z-10">
                    <h2 className="text-4xl font-bold text-white mb-2 text-glow">{currentTrack.title}</h2>
                    <p className="text-xl text-cyan-400 font-medium">{currentTrack.artist || 'Unknown Artist'}</p>
                </div>

                {/* Waveform Canvas */}
                <div className="flex-1 relative mt-32">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full opacity-90"
                    />
                </div>

                {/* Visualization Controls */}
                <div className="absolute top-32 right-6 bg-black/60 backdrop-blur-md rounded-xl p-4 border border-white/10">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Display</div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showBeatGrid}
                                onChange={(e) => setShowBeatGrid(e.target.checked)}
                                className="accent-cyan-500"
                            />
                            <span className="text-sm text-white">Beat Grid</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showCuePoints}
                                onChange={(e) => setShowCuePoints(e.target.checked)}
                                className="accent-cyan-500"
                            />
                            <span className="text-sm text-white">Cue Points</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showStructure}
                                onChange={(e) => setShowStructure(e.target.checked)}
                                className="accent-cyan-500"
                            />
                            <span className="text-sm text-white">Structure</span>
                        </label>
                    </div>
                </div>

                {/* Cue Point Buttons */}
                {currentTrack.cuePoints && (
                    <div className="absolute bottom-6 left-6 flex gap-3">
                        <button
                            onClick={() => jumpToCue(currentTrack.cuePoints!.mixIn)}
                            className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg font-mono text-sm hover:bg-green-500/30 transition-colors"
                        >
                            ▶ MIX IN
                        </button>
                        <button
                            onClick={() => jumpToCue(currentTrack.cuePoints!.mixOut)}
                            className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg font-mono text-sm hover:bg-red-500/30 transition-colors"
                        >
                            ▶ MIX OUT
                        </button>
                    </div>
                )}

                {/* Next Track Preview */}
                {nextTrack && (
                    <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md rounded-xl p-4 border border-white/10 max-w-xs">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Up Next</div>
                        <div className="font-bold text-white">{nextTrack.title}</div>
                        <div className="text-sm text-slate-400">{nextTrack.artist || 'Unknown Artist'}</div>
                        <div className="flex gap-3 mt-2 text-xs font-mono">
                            <span className="text-cyan-400">{nextTrack.bpm} BPM</span>
                            <span className="text-purple-400">{nextTrack.harmonic?.key || nextTrack.key}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="h-32 bg-black/60 backdrop-blur-xl border-t border-white/10 flex items-center justify-center gap-12 relative">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 cursor-pointer group">
                    <div
                        className="h-full bg-cyan-500 relative group-hover:h-2 transition-all"
                        style={{ width: `${currentTrack.duration ? (currentTime / currentTrack.duration) * 100 : 0}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                <button
                    onClick={skipToPrevious}
                    className="p-4 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                    disabled={tracks.findIndex(t => t.id === currentTrack.id) === 0}
                >
                    <BackwardIcon className="w-8 h-8" />
                </button>

                <button
                    onClick={togglePlayPause}
                    className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 hover:shadow-[0_0_50px_rgba(6,182,212,0.6)] transition-all"
                >
                    {isPlaying ? (
                        <PauseIcon className="w-10 h-10 text-white" />
                    ) : (
                        <PlayIcon className="w-10 h-10 text-white ml-1" />
                    )}
                </button>

                <button
                    onClick={skipToNext}
                    className="p-4 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                    disabled={!nextTrack}
                >
                    <ForwardIcon className="w-8 h-8" />
                </button>

                {/* Volume */}
                <div className="absolute right-10 flex items-center gap-3 group">
                    <SpeakerWaveIcon className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-24 accent-cyan-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                    />
                </div>

                {/* Time Display */}
                <div className="absolute left-10 font-mono text-white">
                    {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor((currentTrack.duration || 0) / 60)}:{Math.floor((currentTrack.duration || 0) % 60).toString().padStart(2, '0')}
                </div>
            </div>
        </div>
    );
}
