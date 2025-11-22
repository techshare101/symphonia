'use client';

import {
    CheckCircleIcon,
    ClockIcon,
    ArrowPathIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/solid';

export type TrackStatus = 'uploading' | 'analyzing' | 'ready' | 'subtitles' | 'complete' | 'error';

interface StatusBadgeProps {
    status: TrackStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const config = {
        uploading: {
            color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            icon: ArrowPathIcon,
            label: 'Uploading',
            animate: true
        },
        analyzing: {
            color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            icon: ArrowPathIcon,
            label: 'Analyzing',
            animate: true
        },
        ready: {
            color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            icon: ClockIcon,
            label: 'Ready',
            animate: false
        },
        subtitles: {
            color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            icon: ArrowPathIcon,
            label: 'Subtitles',
            animate: true
        },
        complete: {
            color: 'bg-green-500/10 text-green-400 border-green-500/20',
            icon: CheckCircleIcon,
            label: 'Complete',
            animate: false
        },
        error: {
            color: 'bg-red-500/10 text-red-400 border-red-500/20',
            icon: ExclamationCircleIcon,
            label: 'Error',
            animate: false
        }
    };

    const { color, icon: Icon, label, animate } = config[status] || config.error;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
            <Icon className={`w-3.5 h-3.5 ${animate ? 'animate-spin' : ''}`} />
            {label}
        </div>
    );
}
