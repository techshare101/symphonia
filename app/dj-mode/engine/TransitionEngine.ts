/**
 * Transition Engine - Layer 2 of Auto-DJ Engine
 * 
 * Analyzes track structure, detects phrase boundaries, matches energy curves,
 * and calculates optimal transition points between tracks.
 */

import {
    Track,
    AutoDJMode,
    TransitionPlan,
    StructureMap,
    TransitionProfile
} from './types';

export class TransitionEngine {
    private modeProfiles: Record<AutoDJMode, TransitionProfile> = {
        [AutoDJMode.SMOOTH_CLUB]: {
            crossfadeDuration: 8,
            phraseAlignment: true,
            claveDetection: false,
            energyMatching: 'soft',
            arcAwareness: false,
            transitionCurve: 'smooth',
            phraseBars: 16
        },
        [AutoDJMode.HIGH_ENERGY]: {
            crossfadeDuration: 4,
            phraseAlignment: true,
            claveDetection: false,
            energyMatching: 'hard',
            arcAwareness: false,
            transitionCurve: 'exponential',
            phraseBars: 8
        },
        [AutoDJMode.LATIN_SALSA]: {
            crossfadeDuration: 6,
            phraseAlignment: true,
            claveDetection: true,
            energyMatching: 'hard',
            arcAwareness: false,
            transitionCurve: 'smooth',
            phraseBars: 8,
            tumbaoPres ervation: true,
            montunoAlignment: true
        },
        [AutoDJMode.CINEMATIC_AI]: {
            crossfadeDuration: 12,
            phraseAlignment: true,
            claveDetection: false,
            energyMatching: 'soft',
            arcAwareness: true,
            transitionCurve: 'smooth',
            phraseBars: 16,
            emotionalMapping: true
        }
    };

    /**
     * Analyze track structure from available data
     */
    analyzeStructure(track: Track): StructureMap {
        const structure: StructureMap = {
            verses: [],
            choruses: [],
            breaks: [],
            drops: [],
            bridges: []
        };

        // Use existing structure data if available
        if (track.structure) {
            if (track.structure.intro) {
                structure.intro = track.structure.intro;
            }
            if (track.structure.outro) {
                structure.outro = track.structure.outro;
            }
            if (track.structure.drop) {
                structure.drops.push(track.structure.drop);
            }
            if (track.structure.breakdowns) {
                structure.breaks = track.structure.breakdowns;
            }
        }

        return structure;
    }

    /**
     * Detect phrase boundaries based on BPM and track structure
     */
    detectPhraseBoundaries(track: Track, phraseBars: number = 8): number[] {
        const boundaries: number[] = [];

        if (!track.bpm || !track.duration) {
            return boundaries;
        }

        const beatsPerPhrase = phraseBars * 4; // 4 beats per bar
        const secondsPerBeat = 60 / track.bpm;
        const phraseLength = beatsPerPhrase * secondsPerBeat;

        // Generate phrase boundaries throughout the track
        for (let time = 0; time < track.duration; time += phraseLength) {
            boundaries.push(time);
        }

        return boundaries;
    }

    /**
     * Calculate optimal transition point between two tracks
     */
    calculateTransitionPoint(
        trackA: Track,
        trackB: Track,
        mode: AutoDJMode
    ): TransitionPlan {
        const profile = this.modeProfiles[mode];

        // Get mix-out point from Track A
        const mixOutPoint = this.findMixOutPoint(trackA, profile);

        // Get mix-in point for Track B
        const mixInPoint = this.findMixInPoint(trackB, profile);

        // Calculate beat alignment if BPMs are available
        const beatAlignment = this.calculateBeatAlignment(trackA, trackB);

        return {
            mixOutPoint,
            mixInPoint,
            crossfadeDuration: profile.crossfadeDuration,
            curve: profile.transitionCurve,
            beatAlignment
        };
    }

    /**
     * Match energy curves between two tracks
     */
    matchEnergyCurves(trackA: Track, trackB: Track): number {
        if (!trackA.energyCurve || !trackB.energyCurve) {
            return 0.5; // Neutral score if no energy data
        }

        // Compare energy at transition points
        const energyA = this.getAverageEnergy(trackA.energyCurve, 0.8, 1.0); // Last 20%
        const energyB = this.getAverageEnergy(trackB.energyCurve, 0.0, 0.2); // First 20%

        // Calculate compatibility (0-1 scale)
        const energyDiff = Math.abs(energyA - energyB);
        const compatibility = 1 - (energyDiff / 100);

        return Math.max(0, Math.min(1, compatibility));
    }

    /**
     * Align phrases between two tracks
     */
    alignPhrases(
        trackA: Track,
        trackB: Track,
        phraseBars: number = 8
    ): { offsetA: number; offsetB: number } {
        const boundariesA = this.detectPhraseBoundaries(trackA, phraseBars);
        const boundariesB = this.detectPhraseBoundaries(trackB, phraseBars);

        // Find the last phrase boundary in Track A (for mix-out)
        const offsetA = boundariesA.length > 0
            ? boundariesA[boundariesA.length - Math.ceil(boundariesA.length * 0.2)]
            : trackA.duration ? trackA.duration * 0.8 : 0;

        // Find the first phrase boundary in Track B (for mix-in)
        const offsetB = boundariesB.length > 1
            ? boundariesB[1] // Second phrase (skip intro)
            : 0;

        return { offsetA, offsetB };
    }

    // Private helper methods

    private findMixOutPoint(track: Track, profile: TransitionProfile): number {
        // Use cue point if available
        if (track.cuePoints?.mixOut) {
            return track.cuePoints.mixOut;
        }

        // Use outro start if available
        if (track.structure?.outro) {
            return track.structure.outro.start;
        }

        // Default to last 20% of track
        const duration = track.duration || 240;
        return duration * 0.8;
    }

    private findMixInPoint(track: Track, profile: TransitionProfile): number {
        // Use cue point if available
        if (track.cuePoints?.mixIn) {
            return track.cuePoints.mixIn;
        }

        // Use intro end if available
        if (track.structure?.intro) {
            return track.structure.intro.end;
        }

        // Default to start of track
        return 0;
    }

    private calculateBeatAlignment(trackA: Track, trackB: Track): number {
        if (!trackA.bpm || !trackB.bpm) {
            return 0;
        }

        // Calculate beat offset for perfect alignment
        const secondsPerBeatA = 60 / trackA.bpm;
        const secondsPerBeatB = 60 / trackB.bpm;

        // For now, return 0 (perfect alignment)
        // Future: implement phase alignment
        return 0;
    }

    private getAverageEnergy(
        energyCurve: number[],
        startPercent: number,
        endPercent: number
    ): number {
        const startIndex = Math.floor(energyCurve.length * startPercent);
        const endIndex = Math.floor(energyCurve.length * endPercent);

        const slice = energyCurve.slice(startIndex, endIndex);
        const sum = slice.reduce((acc, val) => acc + val, 0);

        return slice.length > 0 ? sum / slice.length : 50;
    }
}
