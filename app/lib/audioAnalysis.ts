/**
 * Enhanced Audio Analysis Engine - Pro Mode
 * 
 * Sophisticated simulation algorithms for DJ-grade audio analysis.
 * Generates realistic metadata for structural analysis, musical intelligence,
 * emotion detection, and transition awareness.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BeatMarker {
    time: number;        // seconds
    confidence: number;  // 0-1
}

export interface TimeRange {
    start: number;
    end: number;
}

export interface TrackStructure {
    intro: TimeRange;
    drop: number;
    outro: TimeRange;
    breakdowns: TimeRange[];
}

export interface HarmonicAnalysis {
    key: string;           // Camelot notation (e.g., "8A")
    musicalKey: string;    // Musical notation (e.g., "Am")
    confidence: number;    // 0-100
    compatible: string[];  // Compatible Camelot keys
}

export interface MoodClassification {
    valence: number;       // -1 to 1 (sad to happy)
    arousal: number;       // -1 to 1 (calm to energetic)
    class: string;         // 'euphoric', 'melancholic', 'energetic', 'chill', 'intense'
}

export interface PeakMoments {
    emotionalPeak: number;    // timestamp in seconds
    breakdown: number;        // timestamp in seconds
    crowdExplosion: number;   // timestamp in seconds
}

export interface CuePoints {
    start: number;      // Track start (usually 0)
    mixIn: number;      // Suggested mix-in point
    mixOut: number;     // Suggested mix-out point
    end: number;        // Track end
}

export interface EnhancedTrackAnalysis {
    // Level 1 - Structural
    energyCurve: number[];
    beatGrid: BeatMarker[];
    structure: TrackStructure;

    // Level 2 - Musical
    harmonic: HarmonicAnalysis;
    danceability: number;

    // Level 3 - Emotion
    mood: MoodClassification;
    peakMoments: PeakMoments;

    // Level 4 - Transition
    cuePoints: CuePoints;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Simple Perlin-like noise generator for natural variation
 */
function perlinNoise(x: number, seed: number = 0): number {
    const n = Math.sin(x * 12.9898 + seed) * 43758.5453123;
    return n - Math.floor(n);
}

/**
 * Smooth interpolation between values
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

/**
 * Generate a seed from track title for consistent results
 */
function generateSeed(title: string): number {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = ((hash << 5) - hash) + title.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// ============================================================================
// LEVEL 1: STRUCTURAL ANALYSIS
// ============================================================================

/**
 * Generate realistic energy curve using sine waves + Perlin noise
 * Returns 100 data points representing energy over track duration
 */
export function generateEnergyCurve(duration: number, bpm: number, seed: number): number[] {
    const points = 100;
    const curve: number[] = [];

    // Base energy level influenced by BPM (higher BPM = higher base energy)
    const baseEnergy = 30 + (bpm - 80) * 0.5;

    for (let i = 0; i < points; i++) {
        const progress = i / points;
        const time = progress * duration;

        // Create natural energy arc (build up, sustain, wind down)
        let energy = baseEnergy;

        // Intro build-up (0-15%)
        if (progress < 0.15) {
            energy += smoothstep(0, 0.15, progress) * 30;
        }
        // Main section (15-75%)
        else if (progress < 0.75) {
            energy += 30 + Math.sin((progress - 0.15) * 8) * 15;
        }
        // Outro wind-down (75-100%)
        else {
            energy += 30 * (1 - smoothstep(0.75, 1, progress));
        }

        // Add Perlin noise for natural variation
        const noise = perlinNoise(time * 0.5, seed) * 10;
        energy += noise;

        // Add occasional peaks (drops/buildups)
        if (Math.sin(time * 0.3 + seed) > 0.85) {
            energy += 15;
        }

        // Clamp to 0-100
        curve.push(Math.max(0, Math.min(100, energy)));
    }

    return curve;
}

/**
 * Generate beat grid with phase-aligned positions and confidence scores
 */
export function generateBeatGrid(duration: number, bpm: number, seed: number): BeatMarker[] {
    const beatInterval = 60 / bpm; // seconds per beat
    const beats: BeatMarker[] = [];

    // Add slight BPM variation for realism (±0.5%)
    const bpmVariation = 1 + (perlinNoise(seed, 1) - 0.5) * 0.01;

    let time = 0;
    while (time < duration) {
        // Confidence decreases slightly at intro/outro
        const progress = time / duration;
        let confidence = 0.95;

        if (progress < 0.05 || progress > 0.95) {
            confidence = 0.7 + perlinNoise(time, seed) * 0.2;
        }

        beats.push({
            time: parseFloat(time.toFixed(3)),
            confidence: parseFloat(confidence.toFixed(2))
        });

        time += beatInterval * bpmVariation;
    }

    return beats;
}

/**
 * Detect intro, drop, and outro sections
 */
export function detectIntroOutro(duration: number, energyCurve: number[]): TrackStructure {
    // Intro: typically first 10-20% of track
    const introLength = duration * (0.10 + Math.random() * 0.10);

    // Drop: find first major energy peak (usually around 15-25%)
    const dropPoint = duration * (0.15 + Math.random() * 0.10);

    // Outro: typically last 10-15% of track
    const outroStart = duration * (0.85 + Math.random() * 0.05);

    // Find breakdown sections (energy valleys in middle section)
    const breakdowns: TimeRange[] = [];
    const middleStart = duration * 0.3;
    const middleEnd = duration * 0.7;

    // Look for energy drops in the middle section
    for (let i = 30; i < 70; i++) {
        if (energyCurve[i] < 40 && energyCurve[i - 1] > 50) {
            // Found a breakdown
            const start = (i / 100) * duration;
            const end = Math.min(start + 8 + Math.random() * 8, middleEnd); // 8-16 seconds
            breakdowns.push({ start, end });
        }
    }

    return {
        intro: {
            start: 0,
            end: parseFloat(introLength.toFixed(2))
        },
        drop: parseFloat(dropPoint.toFixed(2)),
        outro: {
            start: parseFloat(outroStart.toFixed(2)),
            end: duration
        },
        breakdowns
    };
}

/**
 * Detect breakdown sections (low-energy valleys)
 */
export function detectBreakdowns(energyCurve: number[], duration: number): TimeRange[] {
    const breakdowns: TimeRange[] = [];
    let inBreakdown = false;
    let breakdownStart = 0;

    for (let i = 0; i < energyCurve.length; i++) {
        const progress = i / energyCurve.length;
        const time = progress * duration;

        // Skip intro and outro
        if (progress < 0.2 || progress > 0.8) continue;

        if (energyCurve[i] < 35 && !inBreakdown) {
            inBreakdown = true;
            breakdownStart = time;
        } else if (energyCurve[i] > 50 && inBreakdown) {
            inBreakdown = false;
            breakdowns.push({
                start: parseFloat(breakdownStart.toFixed(2)),
                end: parseFloat(time.toFixed(2))
            });
        }
    }

    return breakdowns;
}

// ============================================================================
// LEVEL 2: MUSICAL INTELLIGENCE
// ============================================================================

/**
 * Analyze harmonic content and generate Camelot key
 */
export function analyzeHarmony(musicalKey: string, seed: number): HarmonicAnalysis {
    // Convert musical key to Camelot notation
    const camelotKey = musicalKeyToCamelot(musicalKey);

    // Confidence based on key clarity (minor keys slightly less confident)
    const isMinor = musicalKey.includes('m') && !musicalKey.includes('maj');
    const baseConfidence = isMinor ? 85 : 92;
    const confidence = baseConfidence + perlinNoise(seed, 2) * 8;

    // Get compatible keys for harmonic mixing
    const compatible = getCompatibleKeys(camelotKey);

    return {
        key: camelotKey,
        musicalKey,
        confidence: parseFloat(confidence.toFixed(1)),
        compatible
    };
}

/**
 * Calculate danceability score (0-100)
 * Based on tempo stability, beat salience, and energy patterns
 */
export function calculateDanceability(
    bpm: number,
    energy: number,
    beatGrid: BeatMarker[],
    seed: number
): number {
    // Optimal BPM range for dancing: 120-130
    const bpmScore = 100 - Math.abs(bpm - 125) * 2;

    // Higher energy = more danceable
    const energyScore = energy * 100;

    // Beat consistency (average confidence from beat grid)
    const avgConfidence = beatGrid.reduce((sum, beat) => sum + beat.confidence, 0) / beatGrid.length;
    const beatScore = avgConfidence * 100;

    // Weighted average
    const danceability = (bpmScore * 0.4 + energyScore * 0.3 + beatScore * 0.3);

    // Add slight variation
    const variation = perlinNoise(seed, 3) * 5;

    return parseFloat(Math.max(0, Math.min(100, danceability + variation)).toFixed(1));
}

// ============================================================================
// LEVEL 3: EMOTION & MOOD
// ============================================================================

/**
 * Classify mood based on valence (happy/sad) and arousal (calm/energetic)
 */
export function classifyMood(bpm: number, energy: number, key: string, seed: number): MoodClassification {
    // Valence: influenced by major/minor key
    const isMinor = key.includes('m') && !key.includes('maj');
    let valence = isMinor ? -0.3 : 0.4;

    // Add BPM influence (faster = happier)
    valence += (bpm - 100) * 0.005;

    // Arousal: influenced by BPM and energy
    let arousal = (bpm - 80) * 0.01 + (energy - 0.5);

    // Add noise for variation
    valence += (perlinNoise(seed, 4) - 0.5) * 0.3;
    arousal += (perlinNoise(seed, 5) - 0.5) * 0.3;

    // Clamp to -1 to 1
    valence = Math.max(-1, Math.min(1, valence));
    arousal = Math.max(-1, Math.min(1, arousal));

    // Determine mood class
    let moodClass: string;
    if (valence > 0.3 && arousal > 0.3) moodClass = 'euphoric';
    else if (valence < -0.3 && arousal < -0.3) moodClass = 'melancholic';
    else if (arousal > 0.5) moodClass = 'energetic';
    else if (arousal < -0.3) moodClass = 'chill';
    else moodClass = 'balanced';

    return {
        valence: parseFloat(valence.toFixed(2)),
        arousal: parseFloat(arousal.toFixed(2)),
        class: moodClass
    };
}

/**
 * Find peak emotional moments in the track
 */
export function findPeakMoments(
    energyCurve: number[],
    duration: number,
    structure: TrackStructure
): PeakMoments {
    // Emotional peak: highest energy point after the drop
    const dropIndex = Math.floor((structure.drop / duration) * energyCurve.length);
    let maxEnergy = 0;
    let peakIndex = dropIndex;

    for (let i = dropIndex; i < energyCurve.length * 0.7; i++) {
        if (energyCurve[i] > maxEnergy) {
            maxEnergy = energyCurve[i];
            peakIndex = i;
        }
    }

    const emotionalPeak = (peakIndex / energyCurve.length) * duration;

    // Breakdown: first major energy valley in middle section
    let breakdown = structure.breakdowns.length > 0
        ? structure.breakdowns[0].start
        : duration * 0.5;

    // Crowd explosion: rapid energy rise after breakdown
    const crowdExplosion = Math.min(breakdown + 8 + Math.random() * 8, duration * 0.75);

    return {
        emotionalPeak: parseFloat(emotionalPeak.toFixed(2)),
        breakdown: parseFloat(breakdown.toFixed(2)),
        crowdExplosion: parseFloat(crowdExplosion.toFixed(2))
    };
}

// ============================================================================
// LEVEL 4: TRANSITION AWARENESS
// ============================================================================

/**
 * Generate optimal cue points for DJ mixing
 */
export function generateCuePoints(structure: TrackStructure, duration: number): CuePoints {
    return {
        start: 0,
        mixIn: parseFloat((structure.intro.end - 4).toFixed(2)), // 4 seconds before intro ends
        mixOut: parseFloat((structure.outro.start + 4).toFixed(2)), // 4 seconds into outro
        end: duration
    };
}

/**
 * Calculate transition compatibility score between two tracks
 */
export function calculateTransitionScore(
    track1: Partial<EnhancedTrackAnalysis>,
    track2: Partial<EnhancedTrackAnalysis>,
    bpm1: number,
    bpm2: number
): number {
    // BPM compatibility (±6% is perfect)
    const bpmDelta = Math.abs(bpm1 - bpm2) / bpm1;
    const bpmScore = Math.max(0, 100 - (bpmDelta * 1000));

    // Key compatibility (will be enhanced with Camelot wheel)
    const keyScore = 70; // Placeholder

    // Energy continuity (compare end of track1 with start of track2)
    let energyScore = 70;
    if (track1.energyCurve && track2.energyCurve) {
        const energy1End = track1.energyCurve[track1.energyCurve.length - 1];
        const energy2Start = track2.energyCurve[0];
        const energyDelta = Math.abs(energy1End - energy2Start);
        energyScore = Math.max(0, 100 - energyDelta);
    }

    // Danceability continuity
    let danceScore = 70;
    if (track1.danceability !== undefined && track2.danceability !== undefined) {
        const danceDelta = Math.abs(track1.danceability - track2.danceability);
        danceScore = Math.max(0, 100 - danceDelta);
    }

    // Weighted average
    const overall = (bpmScore * 0.4 + keyScore * 0.2 + energyScore * 0.25 + danceScore * 0.15);

    return parseFloat(overall.toFixed(1));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert musical key to Camelot notation
 */
function musicalKeyToCamelot(key: string): string {
    const camelotMap: { [key: string]: string } = {
        'C': '8B', 'Cm': '5A',
        'C#': '3B', 'C#m': '12A', 'Db': '3B', 'Dbm': '12A',
        'D': '10B', 'Dm': '7A',
        'D#': '5B', 'D#m': '2A', 'Eb': '5B', 'Ebm': '2A',
        'E': '12B', 'Em': '9A',
        'F': '7B', 'Fm': '4A',
        'F#': '2B', 'F#m': '11A', 'Gb': '2B', 'Gbm': '11A',
        'G': '9B', 'Gm': '6A',
        'G#': '4B', 'G#m': '1A', 'Ab': '4B', 'Abm': '1A',
        'A': '11B', 'Am': '8A',
        'A#': '6B', 'A#m': '3A', 'Bb': '6B', 'Bbm': '3A',
        'B': '1B', 'Bm': '10A'
    };

    return camelotMap[key] || '8A';
}

/**
 * Get compatible keys for harmonic mixing (Camelot wheel rules)
 */
function getCompatibleKeys(camelotKey: string): string[] {
    const number = parseInt(camelotKey);
    const letter = camelotKey.slice(-1);

    const compatible: string[] = [];

    // Same key
    compatible.push(camelotKey);

    // +1 and -1 on the wheel
    const next = number === 12 ? 1 : number + 1;
    const prev = number === 1 ? 12 : number - 1;
    compatible.push(`${next}${letter}`);
    compatible.push(`${prev}${letter}`);

    // Relative major/minor
    const otherLetter = letter === 'A' ? 'B' : 'A';
    compatible.push(`${number}${otherLetter}`);

    return compatible;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Generate complete enhanced analysis for a track
 */
export function generateEnhancedAnalysis(
    title: string,
    duration: number,
    bpm: number,
    key: string,
    energy: number
): EnhancedTrackAnalysis {
    const seed = generateSeed(title);

    // Level 1: Structural Analysis
    const energyCurve = generateEnergyCurve(duration, bpm, seed);
    const beatGrid = generateBeatGrid(duration, bpm, seed);
    const structure = detectIntroOutro(duration, energyCurve);

    // Level 2: Musical Intelligence
    const harmonic = analyzeHarmony(key, seed);
    const danceability = calculateDanceability(bpm, energy, beatGrid, seed);

    // Level 3: Emotion & Mood
    const mood = classifyMood(bpm, energy, key, seed);
    const peakMoments = findPeakMoments(energyCurve, duration, structure);

    // Level 4: Transition Awareness
    const cuePoints = generateCuePoints(structure, duration);

    return {
        energyCurve,
        beatGrid,
        structure,
        harmonic,
        danceability,
        mood,
        peakMoments,
        cuePoints
    };
}
