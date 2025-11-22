/**
 * Shared types for Auto-DJ Engine
 */

export interface Track {
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

export enum AutoDJMode {
    SMOOTH_CLUB = 'smooth_club',
    HIGH_ENERGY = 'high_energy',
    LATIN_SALSA = 'latin_salsa',
    CINEMATIC_AI = 'cinematic_ai'
}

export interface TransitionProfile {
    crossfadeDuration: number;
    phraseAlignment: boolean;
    claveDetection: boolean;
    energyMatching: 'soft' | 'hard';
    arcAwareness: boolean;
    transitionCurve: 'linear' | 'smooth' | 'exponential';
    phraseBars: number;
    tumbaoPres ervation ?: boolean;
montunoAlignment ?: boolean;
emotionalMapping ?: boolean;
}

export interface TransitionPlan {
    mixOutPoint: number;      // When to start fading out Track A (seconds)
    mixInPoint: number;       // When to start fading in Track B (seconds)
    crossfadeDuration: number;
    curve: 'linear' | 'smooth' | 'exponential';
    beatAlignment: number;    // Offset for beat matching (seconds)
}

export interface StructureMap {
    intro?: { start: number; end: number };
    verses: { start: number; end: number }[];
    choruses: { start: number; end: number }[];
    breaks: { start: number; end: number }[];
    drops: number[];
    bridges: { start: number; end: number }[];
    outro?: { start: number; end: number };
}

export type ClavePattern = '2-3' | '3-2' | 'none';

export interface SalsaAnalysis {
    clavePattern: ClavePattern;
    montunoSections: { start: number; end: number }[];
    tumbaoBass: boolean;
    energyPeaks: number[];
}
