/**
 * Transition Analyzer Component
 * 
 * Shows compatibility between two tracks for smooth DJ mixing.
 * Displays BPM delta, key compatibility, energy curve comparison,
 * and overall transition smoothness score.
 */

'use client';

import { useMemo } from 'react';
import EnergyCurveVisualizer from './EnergyCurveVisualizer';

interface Track {
    id: string;
    title: string;
    artist?: string;
    bpm: number;
    harmonic?: {
        key: string;
        musicalKey: string;
        compatible: string[];
    };
    energyCurve?: number[];
    duration?: number;
    danceability?: number;
}

interface TransitionAnalyzerProps {
    track1: Track;
    track2: Track;
    className?: string;
}

export default function TransitionAnalyzer({ track1, track2, className = '' }: TransitionAnalyzerProps) {
    // Calculate compatibility scores
    const analysis = useMemo(() => {
        // BPM Compatibility (±6% is perfect for mixing)
        const bpmDelta = Math.abs(track1.bpm - track2.bpm);
        const bpmDeltaPercent = (bpmDelta / track1.bpm) * 100;
        const bpmScore = Math.max(0, 100 - (bpmDeltaPercent * 16.67)); // 6% = 100 points

        // Key Compatibility (Camelot wheel)
        let keyScore = 50; // Default neutral
        if (track1.harmonic && track2.harmonic) {
            if (track1.harmonic.key === track2.harmonic.key) {
                keyScore = 100; // Same key = perfect
            } else if (track1.harmonic.compatible.includes(track2.harmonic.key)) {
                keyScore = 90; // Compatible key = excellent
            } else {
                // Calculate distance on Camelot wheel
                const num1 = parseInt(track1.harmonic.key);
                const num2 = parseInt(track2.harmonic.key);
                const distance = Math.min(
                    Math.abs(num1 - num2),
                    12 - Math.abs(num1 - num2)
                );
                keyScore = Math.max(20, 100 - (distance * 15));
            }
        }

        // Energy Continuity (compare end of track1 with start of track2)
        let energyScore = 70;
        if (track1.energyCurve && track2.energyCurve) {
            const energy1End = track1.energyCurve[track1.energyCurve.length - 1];
            const energy2Start = track2.energyCurve[0];
            const energyDelta = Math.abs(energy1End - energy2Start);
            energyScore = Math.max(0, 100 - energyDelta);
        }

        // Danceability Continuity
        let danceScore = 70;
        if (track1.danceability !== undefined && track2.danceability !== undefined) {
            const danceDelta = Math.abs(track1.danceability - track2.danceability);
            danceScore = Math.max(0, 100 - danceDelta);
        }

        // Overall smoothness (weighted average)
        const overall = (
            bpmScore * 0.4 +
            keyScore * 0.25 +
            energyScore * 0.2 +
            danceScore * 0.15
        );

        return {
            bpmScore: Math.round(bpmScore),
            bpmDelta,
            bpmDeltaPercent: bpmDeltaPercent.toFixed(1),
            keyScore: Math.round(keyScore),
            energyScore: Math.round(energyScore),
            danceScore: Math.round(danceScore),
            overall: Math.round(overall)
        };
    }, [track1, track2]);

    // Get color based on score
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-green-500/20 border-green-500/30';
        if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
        if (score >= 40) return 'bg-orange-500/20 border-orange-500/30';
        return 'bg-red-500/20 border-red-500/30';
    };

    return (
        <div className={`bg-black/40 rounded-xl border border-white/10 p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Transition Analysis</h3>
                <div className={`px-4 py-2 rounded-lg border ${getScoreBg(analysis.overall)}`}>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Smoothness</div>
                    <div className={`text-2xl font-bold ${getScoreColor(analysis.overall)}`}>
                        {analysis.overall}%
                    </div>
                </div>
            </div>

            {/* Track Names */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/30">
                    <div className="text-xs text-cyan-400 mb-1">From</div>
                    <div className="font-bold text-white truncate">{track1.title}</div>
                    <div className="text-xs text-slate-400 truncate">{track1.artist || 'Unknown'}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-purple-500/30">
                    <div className="text-xs text-purple-400 mb-1">To</div>
                    <div className="font-bold text-white truncate">{track2.title}</div>
                    <div className="text-xs text-slate-400 truncate">{track2.artist || 'Unknown'}</div>
                </div>
            </div>

            {/* Compatibility Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* BPM Compatibility */}
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">BPM Match</span>
                        <span className={`text-lg font-bold ${getScoreColor(analysis.bpmScore)}`}>
                            {analysis.bpmScore}%
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                        {track1.bpm} → {track2.bpm} (Δ{analysis.bpmDelta})
                    </div>
                    <div className="text-xs text-slate-500">
                        {parseFloat(analysis.bpmDeltaPercent) <= 6 ? '✓ Perfect range' : '⚠ May need adjustment'}
                    </div>
                </div>

                {/* Key Compatibility */}
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Key Match</span>
                        <span className={`text-lg font-bold ${getScoreColor(analysis.keyScore)}`}>
                            {analysis.keyScore}%
                        </span>
                    </div>
                    {track1.harmonic && track2.harmonic && (
                        <>
                            <div className="text-xs text-slate-500 font-mono">
                                {track1.harmonic.key} → {track2.harmonic.key}
                            </div>
                            <div className="text-xs text-slate-500">
                                {track1.harmonic.compatible.includes(track2.harmonic.key)
                                    ? '✓ Harmonic match'
                                    : track1.harmonic.key === track2.harmonic.key
                                        ? '✓ Same key'
                                        : '⚠ Different keys'}
                            </div>
                        </>
                    )}
                </div>

                {/* Energy Continuity */}
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Energy Flow</span>
                        <span className={`text-lg font-bold ${getScoreColor(analysis.energyScore)}`}>
                            {analysis.energyScore}%
                        </span>
                    </div>
                    <div className="text-xs text-slate-500">
                        {analysis.energyScore >= 70 ? '✓ Smooth transition' : '⚠ Energy jump'}
                    </div>
                </div>

                {/* Danceability Continuity */}
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Vibe Match</span>
                        <span className={`text-lg font-bold ${getScoreColor(analysis.danceScore)}`}>
                            {analysis.danceScore}%
                        </span>
                    </div>
                    <div className="text-xs text-slate-500">
                        {analysis.danceScore >= 70 ? '✓ Similar vibe' : '⚠ Vibe shift'}
                    </div>
                </div>
            </div>

            {/* Energy Curve Comparison */}
            {track1.energyCurve && track2.energyCurve && track1.duration && track2.duration && (
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                    <div className="text-sm text-slate-400 mb-3">Energy Curve Overlay</div>
                    <div className="relative">
                        <div className="opacity-60">
                            <EnergyCurveVisualizer
                                energyCurve={track1.energyCurve}
                                duration={track1.duration}
                                height={60}
                            />
                        </div>
                        <div className="mt-2 opacity-80">
                            <EnergyCurveVisualizer
                                energyCurve={track2.energyCurve}
                                duration={track2.duration}
                                height={60}
                            />
                        </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-cyan-500 opacity-60"></div>
                            <span className="text-slate-500">{track1.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-cyan-500 opacity-80"></div>
                            <span className="text-slate-500">{track2.title}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Mixing Suggestion */}
            <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="text-xs font-bold text-cyan-400 mb-1">💡 Mixing Suggestion</div>
                <div className="text-xs text-slate-300">
                    {analysis.overall >= 80 && "Perfect transition! Mix during the outro of track 1."}
                    {analysis.overall >= 60 && analysis.overall < 80 && "Good match. Consider a quick cut or short blend."}
                    {analysis.overall >= 40 && analysis.overall < 60 && "Moderate compatibility. Use EQ and effects for smoother blend."}
                    {analysis.overall < 40 && "Challenging transition. Consider adding a bridge track or using creative mixing techniques."}
                </div>
            </div>
        </div>
    );
}
