'use client';

interface TransitionMarkers {
    deckA: {
        mixOutPoint: number;
        mixOutZone: [number, number];
    };
    deckB: {
        mixInPoint: number;
        mixInZone: [number, number];
    };
    score: number;
    recommendation: string;
}

interface TransitionMarkersProps {
    markers: TransitionMarkers;
    duration: number;
    onJumpToPoint: (time: number) => void;
}

export default function TransitionMarkersOverlay({ markers, duration, onJumpToPoint }: TransitionMarkersProps) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400 border-green-500/50 bg-green-500/10';
        if (score >= 60) return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
        return 'text-red-400 border-red-500/50 bg-red-500/10';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return '🔥 Excellent';
        if (score >= 60) return '✓ Good';
        return '⚠️ Moderate';
    };

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Transition Score Badge */}
            <div className="absolute top-4 right-4 pointer-events-auto">
                <div className={`px-4 py-2 rounded-lg border ${getScoreColor(markers.score)} backdrop-blur-md`}>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-70">Transition</div>
                    <div className="text-2xl font-bold font-mono">{markers.score}</div>
                    <div className="text-xs mt-1">{getScoreLabel(markers.score)}</div>
                </div>
            </div>

            {/* Recommendation */}
            <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
                <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-cyan-400 font-bold">💡 Tip:</span>
                        <span className="text-white">{markers.recommendation}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper function to calculate transition markers between two tracks
export function calculateTransitionMarkers(trackA: any, trackB: any): TransitionMarkers | null {
    if (!trackA || !trackB) return null;

    // Use cue points if available, otherwise use structure
    const mixOutPoint = trackA.cuePoints?.mixOut || (trackA.structure?.outro?.start || trackA.duration * 0.75);
    const mixInPoint = trackB.cuePoints?.mixIn || (trackB.structure?.intro?.start || 0);

    // Calculate mix zones (8 seconds before/after the points)
    const mixOutZone: [number, number] = [
        Math.max(0, mixOutPoint - 8),
        Math.min(trackA.duration || 240, mixOutPoint + 8)
    ];

    const mixInZone: [number, number] = [
        Math.max(0, mixInPoint - 4),
        Math.min(trackB.duration || 240, mixInPoint + 4)
    ];

    // Calculate transition score
    let score = 70; // Base score

    // BPM compatibility
    if (trackA.bpm && trackB.bpm) {
        const bpmDiff = Math.abs(trackA.bpm - trackB.bpm);
        if (bpmDiff <= 3) score += 15;
        else if (bpmDiff <= 6) score += 10;
        else if (bpmDiff <= 10) score += 5;
        else score -= 10;
    }

    // Key compatibility
    if (trackA.harmonic?.key && trackB.harmonic?.key) {
        const keyA = trackA.harmonic.key;
        const keyB = trackB.harmonic.key;

        // Same key = perfect
        if (keyA === keyB) {
            score += 15;
        }
        // Compatible keys (simplified Camelot wheel logic)
        else if (isCompatibleKey(keyA, keyB)) {
            score += 10;
        }
    }

    // Ensure score is 0-100
    score = Math.max(0, Math.min(100, score));

    // Generate recommendation
    let recommendation = '';
    if (score >= 80) {
        recommendation = 'Perfect match! Blend during the highlighted zones for a seamless transition.';
    } else if (score >= 60) {
        recommendation = 'Good transition. Watch the BPM and use EQ to smooth the blend.';
    } else {
        recommendation = 'Challenging transition. Consider using effects or a quick cut.';
    }

    return {
        deckA: {
            mixOutPoint,
            mixOutZone
        },
        deckB: {
            mixInPoint,
            mixInZone
        },
        score,
        recommendation
    };
}

// Simplified key compatibility check
function isCompatibleKey(keyA: string, keyB: string): boolean {
    // Extract number and letter from Camelot notation (e.g., "8A")
    const numA = parseInt(keyA);
    const letterA = keyA.slice(-1);
    const numB = parseInt(keyB);
    const letterB = keyB.slice(-1);

    // Same letter, adjacent numbers (e.g., 8A -> 9A or 7A)
    if (letterA === letterB && Math.abs(numA - numB) === 1) return true;

    // Same number, different letter (e.g., 8A -> 8B)
    if (numA === numB && letterA !== letterB) return true;

    return false;
}
