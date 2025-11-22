/**
 * Energy Curve Visualizer Component
 * 
 * Displays a track's energy profile over time with structure markers
 * and interactive hover tooltips.
 */

'use client';

import { useRef, useEffect, useState } from 'react';

interface EnergyCurveVisualizerProps {
    energyCurve: number[];
    duration: number;
    structure?: {
        intro?: { start: number; end: number };
        drop?: number;
        outro?: { start: number; end: number };
        breakdowns?: { start: number; end: number }[];
    };
    height?: number;
    className?: string;
}

export default function EnergyCurveVisualizer({
    energyCurve,
    duration,
    structure,
    height = 120,
    className = ''
}: EnergyCurveVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; energy: number; time: string } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.scale(dpr, dpr);

        const width = rect.width;
        const h = rect.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, h);

        // Draw structure markers (background)
        if (structure) {
            ctx.globalAlpha = 0.15;

            // Intro section
            if (structure.intro) {
                const introEnd = (structure.intro.end / duration) * width;
                ctx.fillStyle = '#06b6d4'; // cyan
                ctx.fillRect(0, 0, introEnd, h);
            }

            // Outro section
            if (structure.outro) {
                const outroStart = (structure.outro.start / duration) * width;
                ctx.fillStyle = '#8b5cf6'; // purple
                ctx.fillRect(outroStart, 0, width - outroStart, h);
            }

            // Breakdown sections
            if (structure.breakdowns) {
                ctx.fillStyle = '#f59e0b'; // amber
                structure.breakdowns.forEach(breakdown => {
                    const start = (breakdown.start / duration) * width;
                    const end = (breakdown.end / duration) * width;
                    ctx.fillRect(start, 0, end - start, h);
                });
            }

            ctx.globalAlpha = 1;
        }

        // Draw energy curve
        ctx.beginPath();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;

        energyCurve.forEach((energy, i) => {
            const x = (i / (energyCurve.length - 1)) * width;
            const y = h - (energy / 100) * h;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Fill area under curve with gradient
        ctx.lineTo(width, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0.05)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw drop marker
        if (structure?.drop) {
            const dropX = (structure.drop / duration) * width;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(dropX, 0);
            ctx.lineTo(dropX, h);
            ctx.stroke();
            ctx.setLineDash([]);
        }

    }, [energyCurve, duration, structure, height]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = x / rect.width;
        const index = Math.floor(progress * energyCurve.length);
        const energy = energyCurve[Math.min(index, energyCurve.length - 1)];
        const time = progress * duration;

        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        setHoverInfo({
            x: e.clientX,
            y: e.clientY,
            energy: Math.round(energy),
            time: timeStr
        });
    };

    const handleMouseLeave = () => {
        setHoverInfo(null);
    };

    return (
        <div className={`relative ${className}`}>
            <canvas
                ref={canvasRef}
                className="w-full rounded-lg"
                style={{ height: `${height}px` }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            />

            {hoverInfo && (
                <div
                    className="fixed z-50 pointer-events-none bg-black/90 text-white px-3 py-2 rounded-lg text-sm border border-cyan-500/30 backdrop-blur-sm"
                    style={{
                        left: hoverInfo.x + 10,
                        top: hoverInfo.y - 40
                    }}
                >
                    <div className="font-mono font-bold text-cyan-400">{hoverInfo.time}</div>
                    <div className="text-xs text-slate-300">Energy: {hoverInfo.energy}%</div>
                </div>
            )}

            {/* Legend */}
            <div className="flex gap-4 mt-2 text-xs text-slate-400">
                {structure?.intro && (
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-cyan-500/30 rounded"></div>
                        <span>Intro</span>
                    </div>
                )}
                {structure?.drop && (
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-red-500"></div>
                        <span>Drop</span>
                    </div>
                )}
                {structure?.breakdowns && structure.breakdowns.length > 0 && (
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-amber-500/30 rounded"></div>
                        <span>Breakdown</span>
                    </div>
                )}
                {structure?.outro && (
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-500/30 rounded"></div>
                        <span>Outro</span>
                    </div>
                )}
            </div>
        </div>
    );
}
