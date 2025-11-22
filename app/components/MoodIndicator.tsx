/**
 * Mood Indicator Component
 * 
 * Displays track mood on a 2D valence/arousal quadrant with
 * animated visualization and color-coded emotional states.
 */

'use client';

interface MoodIndicatorProps {
    mood: {
        valence: number;  // -1 to 1 (sad to happy)
        arousal: number;  // -1 to 1 (calm to energetic)
        class: string;    // 'euphoric', 'melancholic', etc.
    };
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export default function MoodIndicator({ mood, size = 'md', showLabel = true }: MoodIndicatorProps) {
    // Map mood class to colors
    const moodColors: { [key: string]: { bg: string; border: string; text: string; glow: string } } = {
        euphoric: {
            bg: 'bg-gradient-to-br from-yellow-400 to-pink-500',
            border: 'border-yellow-400',
            text: 'text-yellow-400',
            glow: 'shadow-[0_0_20px_rgba(250,204,21,0.5)]'
        },
        energetic: {
            bg: 'bg-gradient-to-br from-orange-400 to-red-500',
            border: 'border-orange-400',
            text: 'text-orange-400',
            glow: 'shadow-[0_0_20px_rgba(251,146,60,0.5)]'
        },
        melancholic: {
            bg: 'bg-gradient-to-br from-blue-500 to-purple-600',
            border: 'border-blue-400',
            text: 'text-blue-400',
            glow: 'shadow-[0_0_20px_rgba(96,165,250,0.5)]'
        },
        chill: {
            bg: 'bg-gradient-to-br from-cyan-400 to-blue-400',
            border: 'border-cyan-400',
            text: 'text-cyan-400',
            glow: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]'
        },
        balanced: {
            bg: 'bg-gradient-to-br from-green-400 to-emerald-500',
            border: 'border-green-400',
            text: 'text-green-400',
            glow: 'shadow-[0_0_20px_rgba(74,222,128,0.5)]'
        }
    };

    const colors = moodColors[mood.class] || moodColors.balanced;

    // Size variants
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-base'
    };

    // Get emoji for mood
    const getMoodEmoji = () => {
        switch (mood.class) {
            case 'euphoric': return '🎉';
            case 'energetic': return '⚡';
            case 'melancholic': return '🌙';
            case 'chill': return '😌';
            case 'balanced': return '✨';
            default: return '🎵';
        }
    };

    // Get mood description
    const getMoodDescription = () => {
        const valenceDesc = mood.valence > 0.3 ? 'Happy' : mood.valence < -0.3 ? 'Sad' : 'Neutral';
        const arousalDesc = mood.arousal > 0.3 ? 'Energetic' : mood.arousal < -0.3 ? 'Calm' : 'Moderate';
        return `${valenceDesc} & ${arousalDesc}`;
    };

    return (
        <div className="flex items-center gap-2">
            {/* Mood Icon */}
            <div className="relative group">
                <div className={`
                    ${sizeClasses[size]}
                    ${colors.bg}
                    ${colors.glow}
                    rounded-full
                    flex items-center justify-center
                    border-2 ${colors.border}
                    transition-all duration-300
                    hover:scale-110
                    animate-pulse-slow
                `}>
                    <span className="text-2xl filter drop-shadow-lg">
                        {getMoodEmoji()}
                    </span>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <div className="bg-black/90 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap border border-white/10 backdrop-blur-sm">
                        <div className="font-bold capitalize">{mood.class}</div>
                        <div className="text-slate-300 text-[10px]">{getMoodDescription()}</div>
                        <div className="text-slate-400 text-[10px] font-mono mt-1">
                            V: {mood.valence.toFixed(2)} | A: {mood.arousal.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Label */}
            {showLabel && (
                <div>
                    <div className={`font-bold capitalize ${colors.text} text-sm`}>
                        {mood.class}
                    </div>
                    {size !== 'sm' && (
                        <div className="text-xs text-slate-400">
                            {getMoodDescription()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Mood Quadrant Chart Component
 * 
 * Full 2D visualization of mood on valence/arousal axes
 */
export function MoodQuadrantChart({ mood }: { mood: MoodIndicatorProps['mood'] }) {
    // Convert -1 to 1 range to 0 to 100 for positioning
    const x = ((mood.valence + 1) / 2) * 100;
    const y = ((1 - mood.arousal) / 2) * 100; // Invert Y axis

    return (
        <div className="relative w-full aspect-square bg-black/40 rounded-xl border border-white/10 p-4">
            {/* Axes */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-px bg-white/20"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-full w-px bg-white/20"></div>
            </div>

            {/* Quadrant Labels */}
            <div className="absolute top-2 left-2 text-xs text-slate-500">Sad & Energetic</div>
            <div className="absolute top-2 right-2 text-xs text-slate-500">Happy & Energetic</div>
            <div className="absolute bottom-2 left-2 text-xs text-slate-500">Sad & Calm</div>
            <div className="absolute bottom-2 right-2 text-xs text-slate-500">Happy & Calm</div>

            {/* Mood Point */}
            <div
                className="absolute w-4 h-4 -ml-2 -mt-2 bg-cyan-400 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse"
                style={{
                    left: `${x}%`,
                    top: `${y}%`
                }}
            >
                <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
            </div>

            {/* Axis Labels */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-xs text-slate-400">
                Valence (Sad → Happy)
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-20 text-xs text-slate-400 -rotate-90">
                Arousal (Calm → Energetic)
            </div>
        </div>
    );
}
