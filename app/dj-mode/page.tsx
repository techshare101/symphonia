'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon, SpeakerWaveIcon, ArrowPathIcon, ArrowLeftIcon, QueueListIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'react-hot-toast';
import DJLibrarySidebar from './components/DJLibrarySidebar';
import SetlistLoader from './components/SetlistLoader';
import DeckQueue from './components/DeckQueue';
import { AutoDJMasterController, AutoDJMode } from './engine';

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
    danceability?: number;
    mood?: {
        class: string;
    };
}

interface DeckState {
    track: Track | null;
    isPlaying: boolean;
    currentTime: number;
    volume: number;
}

export default function DJModePage() {
    const { user } = useAuth();
    const router = useRouter();

    // Deck states
    const [deckA, setDeckA] = useState<DeckState>({
        track: null,
        isPlaying: false,
        currentTime: 0,
        volume: 0.8
    });

    const [deckB, setDeckB] = useState<DeckState>({
        track: null,
        isPlaying: false,
        currentTime: 0,
        volume: 0.8
    });

    // Queue state
    const [queue, setQueue] = useState<Track[]>([]);
    const [queueIndex, setQueueIndex] = useState(0);
    const [setlistInfo, setSetlistInfo] = useState<{ id: string; title: string; arcType?: string } | null>(null);

    // UI state
    const [showSetlistLoader, setShowSetlistLoader] = useState(false);
    const [showBeatGrid, setShowBeatGrid] = useState(true);
    const [showCuePoints, setShowCuePoints] = useState(true);
    const [showStructure, setShowStructure] = useState(true);

    // Auto-DJ state
    const [autoDJEnabled, setAutoDJEnabled] = useState(false);
    const [autoDJMode, setAutoDJMode] = useState<AutoDJMode>(AutoDJMode.LATIN_SALSA);
    const autoDJController = useRef<AutoDJMasterController | null>(null);

    // Audio refs
    const audioRefA = useRef<HTMLAudioElement>(null);
    const audioRefB = useRef<HTMLAudioElement>(null);
    const canvasRefA = useRef<HTMLCanvasElement>(null);
    const canvasRefB = useRef<HTMLCanvasElement>(null);

    // Load track to deck
    const loadTrackToDeck = (track: Track, deck: 'A' | 'B') => {
        const audioSrc = track.downloadURL || (track.storagePath ? `/uploads/${track.storagePath.split('/').pop()}` : '');

        if (deck === 'A') {
            setDeckA({
                track,
                isPlaying: false,
                currentTime: 0,
                volume: deckA.volume
            });
            if (audioRefA.current) {
                audioRefA.current.src = audioSrc;
                audioRefA.current.load();
            }
            toast.success(`${track.title} loaded to Deck A`);
        } else {
            setDeckB({
                track,
                isPlaying: false,
                currentTime: 0,
                volume: deckB.volume
            });
            if (audioRefB.current) {
                audioRefB.current.src = audioSrc;
                audioRefB.current.load();
            }
            toast.success(`${track.title} loaded to Deck B`);
        }
    };

    // Load setlist into queue
    const handleLoadSetlist = (tracks: Track[], info: { id: string; title: string; arcType?: string }) => {
        setQueue(tracks);
        setQueueIndex(0);
        setSetlistInfo(info);

        // Auto-load first two tracks
        if (tracks.length > 0) {
            loadTrackToDeck(tracks[0], 'A');
        }
        if (tracks.length > 1) {
            loadTrackToDeck(tracks[1], 'B');
        }

        toast.success(`Loaded setlist: ${info.title}`);
    };

    // Remove track from queue
    const handleRemoveFromQueue = (index: number) => {
        const newQueue = [...queue];
        newQueue.splice(index, 1);
        setQueue(newQueue);

        // Adjust queue index if needed
        if (index < queueIndex) {
            setQueueIndex(Math.max(0, queueIndex - 1));
        }
    };

    // Toggle play/pause for deck
    const togglePlayPause = (deck: 'A' | 'B') => {
        const audioRef = deck === 'A' ? audioRefA.current : audioRefB.current;
        const deckState = deck === 'A' ? deckA : deckB;
        const setDeck = deck === 'A' ? setDeckA : setDeckB;

        if (!audioRef || !deckState.track) return;

        if (deckState.isPlaying) {
            audioRef.pause();
            setDeck({ ...deckState, isPlaying: false });
        } else {
            audioRef.play();
            setDeck({ ...deckState, isPlaying: true });
        }
    };

    // Toggle Auto-DJ mode
    const toggleAutoDJ = async () => {
        if (!autoDJEnabled) {
            // Enable Auto-DJ
            if (queue.length === 0) {
                toast.error('Load a setlist first to use Auto-DJ');
                return;
            }

            if (!audioRefA.current || !audioRefB.current) {
                toast.error('Audio elements not ready');
                return;
            }

            // Initialize controller if needed
            if (!autoDJController.current) {
                autoDJController.current = new AutoDJMasterController({
                    mode: autoDJMode,
                    enabled: true,
                    onTransition: (fromDeck, toDeck) => {
                        toast.success(`Transitioning from Deck ${fromDeck} to Deck ${toDeck}`);
                    },
                    onTrackChange: (track, deck) => {
                        console.log(`Auto-DJ loaded ${track.title} to Deck ${deck}`);
                    },
                    onComplete: () => {
                        toast.success('Setlist complete!');
                        setAutoDJEnabled(false);
                    }
                });
            }

            // Start Auto-DJ
            try {
                await autoDJController.current.start(
                    queue,
                    setlistInfo?.arcType,
                    audioRefA.current,
                    audioRefB.current,
                    (track) => setDeckA(prev => ({ ...prev, track })),
                    (track) => setDeckB(prev => ({ ...prev, track }))
                );
                setAutoDJEnabled(true);
                toast.success(`Auto-DJ activated in ${getModeLabel(autoDJMode)} mode`);
            } catch (error) {
                console.error('Failed to start Auto-DJ:', error);
                toast.error('Failed to start Auto-DJ');
            }
        } else {
            // Disable Auto-DJ
            if (autoDJController.current) {
                autoDJController.current.stop();
            }
            setAutoDJEnabled(false);
            toast.success('Auto-DJ deactivated');
        }
    };

    // Change Auto-DJ mode
    const handleModeChange = (mode: AutoDJMode) => {
        setAutoDJMode(mode);
        if (autoDJController.current) {
            autoDJController.current.setMode(mode);
        }
        toast.success(`Switched to ${getModeLabel(mode)} mode`);
    };

    // Get mode label for display
    const getModeLabel = (mode: AutoDJMode): string => {
        switch (mode) {
            case AutoDJMode.SMOOTH_CLUB:
                return 'Smooth Club';
            case AutoDJMode.HIGH_ENERGY:
                return 'High Energy';
            case AutoDJMode.LATIN_SALSA:
                return 'Latin Salsa';
            case AutoDJMode.CINEMATIC_AI:
                return 'Cinematic AI';
            default:
                return 'Unknown';
        }
    };

    // Waveform drawing function
    const drawWaveform = (canvas: HTMLCanvasElement, track: Track, currentTime: number) => {
        const ctx = canvas.getContext('2d');
        if (!ctx || !track.energyCurve) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const duration = track.duration || 240;

        ctx.clearRect(0, 0, width, height);

        // Draw energy curve
        ctx.beginPath();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;

        track.energyCurve.forEach((energy, i) => {
            const x = (i / (track.energyCurve!.length - 1)) * width;
            const waveHeight = (energy / 100) * height * 0.6;
            const y = (height - waveHeight) / 2;

            if (i === 0) {
                ctx.moveTo(x, y + waveHeight / 2);
            } else {
                ctx.lineTo(x, y + waveHeight / 2);
            }
        });

        ctx.stroke();

        // Draw playhead
        const playheadX = (currentTime / duration) * width;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
    };

    // Audio time update handlers
    useEffect(() => {
        const audioA = audioRefA.current;
        if (!audioA) return;

        const handleTimeUpdate = () => {
            setDeckA(prev => ({ ...prev, currentTime: audioA.currentTime }));
        };

        audioA.addEventListener('timeupdate', handleTimeUpdate);
        return () => audioA.removeEventListener('timeupdate', handleTimeUpdate);
    }, []);

    useEffect(() => {
        const audioB = audioRefB.current;
        if (!audioB) return;

        const handleTimeUpdate = () => {
            setDeckB(prev => ({ ...prev, currentTime: audioB.currentTime }));
        };

        audioB.addEventListener('timeupdate', handleTimeUpdate);
        return () => audioB.removeEventListener('timeupdate', handleTimeUpdate);
    }, []);

    // Update waveforms
    useEffect(() => {
        if (canvasRefA.current && deckA.track) {
            drawWaveform(canvasRefA.current, deckA.track, deckA.currentTime);
        }
    }, [deckA.track, deckA.currentTime]);

    useEffect(() => {
        if (canvasRefB.current && deckB.track) {
            drawWaveform(canvasRefB.current, deckB.track, deckB.currentTime);
        }
    }, [deckB.track, deckB.currentTime]);

    // Apply volume changes via DOM API (volume is not a valid React prop)
    useEffect(() => {
        if (audioRefA.current) {
            audioRefA.current.volume = deckA.volume;
        }
    }, [deckA.volume]);

    useEffect(() => {
        if (audioRefB.current) {
            audioRefB.current.volume = deckB.volume;
        }
    }, [deckB.volume]);

    if (!user) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-2xl text-white mb-2">Please sign in</p>
                    <p className="text-slate-400">You need to be signed in to use DJ Mode</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 pt-16 bg-black flex">
            {/* Hidden audio elements */}
            <audio ref={audioRefA} />
            <audio ref={audioRefB} />

            {/* Library Sidebar */}
            <DJLibrarySidebar
                userId={user.uid}
                onLoadToDeck={loadTrackToDeck}
                loadedTrackIds={{
                    A: deckA.track?.id,
                    B: deckB.track?.id
                }}
            />

            {/* Main DJ Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                        >
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                        <h1 className="text-2xl font-bold text-white tracking-widest uppercase">
                            <span className="text-cyan-400">DJ</span> Mode
                        </h1>
                        {setlistInfo && (
                            <span className="text-sm text-slate-400 font-mono">
                                {setlistInfo.title}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Auto-DJ Mode Selector */}
                        <select
                            value={autoDJMode}
                            onChange={(e) => handleModeChange(e.target.value as AutoDJMode)}
                            className="px-3 py-2 bg-black/60 border border-white/20 text-white text-sm rounded-lg focus:outline-none focus:border-cyan-400 transition-colors"
                        >
                            <option value={AutoDJMode.LATIN_SALSA}>🎺 Latin Salsa</option>
                            <option value={AutoDJMode.SMOOTH_CLUB}>🍸 Smooth Club</option>
                            <option value={AutoDJMode.HIGH_ENERGY}>⚡ High Energy</option>
                            <option value={AutoDJMode.CINEMATIC_AI}>🎬 Cinematic AI</option>
                        </select>

                        {/* Auto-DJ Toggle */}
                        <button
                            onClick={toggleAutoDJ}
                            disabled={queue.length === 0}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${autoDJEnabled
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                                    : 'bg-gradient-to-r from-cyan-600/50 to-blue-600/50 text-white hover:from-cyan-600 hover:to-blue-600 disabled:opacity-30 disabled:cursor-not-allowed'
                                }`}
                        >
                            <SparklesIcon className="w-5 h-5" />
                            {autoDJEnabled ? 'Auto-DJ ON' : 'Auto-DJ OFF'}
                        </button>

                        <button
                            onClick={() => setShowSetlistLoader(true)}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-bold rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all flex items-center gap-2"
                        >
                            <QueueListIcon className="w-5 h-5" />
                            Load Setlist
                        </button>
                    </div>
                </div>

                {/* Decks */}
                <div className="flex-1 grid grid-rows-2 gap-4 p-4">
                    {/* Deck A */}
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-bold text-cyan-400">DECK A</span>
                                {deckA.track && (
                                    <div>
                                        <p className="text-xl font-bold text-white">{deckA.track.title}</p>
                                        <p className="text-sm text-slate-400">{deckA.track.artist || 'Unknown'}</p>
                                    </div>
                                )}
                            </div>
                            {deckA.track && (
                                <div className="flex gap-4 text-sm font-mono">
                                    <span className="text-cyan-400">{deckA.track.bpm} BPM</span>
                                    <span className="text-purple-400">{deckA.track.harmonic?.key || deckA.track.key}</span>
                                </div>
                            )}
                        </div>

                        {/* Waveform */}
                        <div className="flex-1 relative bg-black/40 rounded-xl overflow-hidden">
                            {deckA.track ? (
                                <canvas ref={canvasRefA} className="w-full h-full" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    <p>Load a track to Deck A</p>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <button
                                onClick={() => togglePlayPause('A')}
                                disabled={!deckA.track}
                                className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {deckA.isPlaying ? (
                                    <PauseIcon className="w-8 h-8 text-white" />
                                ) : (
                                    <PlayIcon className="w-8 h-8 text-white ml-1" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Deck B */}
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-bold text-purple-400">DECK B</span>
                                {deckB.track && (
                                    <div>
                                        <p className="text-xl font-bold text-white">{deckB.track.title}</p>
                                        <p className="text-sm text-slate-400">{deckB.track.artist || 'Unknown'}</p>
                                    </div>
                                )}
                            </div>
                            {deckB.track && (
                                <div className="flex gap-4 text-sm font-mono">
                                    <span className="text-cyan-400">{deckB.track.bpm} BPM</span>
                                    <span className="text-purple-400">{deckB.track.harmonic?.key || deckB.track.key}</span>
                                </div>
                            )}
                        </div>

                        {/* Waveform */}
                        <div className="flex-1 relative bg-black/40 rounded-xl overflow-hidden">
                            {deckB.track ? (
                                <canvas ref={canvasRefB} className="w-full h-full" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    <p>Load a track to Deck B</p>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <button
                                onClick={() => togglePlayPause('B')}
                                disabled={!deckB.track}
                                className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {deckB.isPlaying ? (
                                    <PauseIcon className="w-8 h-8 text-white" />
                                ) : (
                                    <PlayIcon className="w-8 h-8 text-white ml-1" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Queue Sidebar */}
            <DeckQueue
                tracks={queue}
                currentIndex={queueIndex}
                onRemoveTrack={handleRemoveFromQueue}
                setlistTitle={setlistInfo?.title}
            />

            {/* Setlist Loader Modal */}
            {showSetlistLoader && (
                <SetlistLoader
                    userId={user.uid}
                    onLoadSetlist={handleLoadSetlist}
                    onClose={() => setShowSetlistLoader(false)}
                />
            )}
        </div>
    );
}
