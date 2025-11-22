/**
 * Queue Navigator - Layer 3 of Auto-DJ Engine
 * 
 * Manages setlist progression, auto-loads next tracks, and adjusts
 * transitions based on setlist arc position.
 */

import { Track, TransitionPlan, AutoDJMode } from './types';

export type ArcPosition = 'opener' | 'buildup' | 'peak' | 'cooldown' | 'closer';

export class QueueNavigator {
    private queue: Track[] = [];
    private currentIndex: number = 0;
    private setlistArcType?: string;

    constructor(queue: Track[] = [], arcType?: string) {
        this.queue = queue;
        this.setlistArcType = arcType;
    }

    /**
     * Get current track
     */
    getCurrentTrack(): Track | null {
        if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
            return this.queue[this.currentIndex];
        }
        return null;
    }

    /**
     * Get next track in queue
     */
    getNextTrack(): Track | null {
        const nextIndex = this.currentIndex + 1;
        if (nextIndex < this.queue.length) {
            return this.queue[nextIndex];
        }
        return null;
    }

    /**
     * Get track at specific offset from current
     */
    getTrackAt(offset: number): Track | null {
        const index = this.currentIndex + offset;
        if (index >= 0 && index < this.queue.length) {
            return this.queue[index];
        }
        return null;
    }

    /**
     * Advance to next track in queue
     */
    advanceQueue(): boolean {
        if (this.currentIndex < this.queue.length - 1) {
            this.currentIndex++;
            return true;
        }
        return false; // End of queue
    }

    /**
     * Get current position in queue
     */
    getQueuePosition(): { current: number; total: number } {
        return {
            current: this.currentIndex + 1,
            total: this.queue.length
        };
    }

    /**
     * Check if there are more tracks in queue
     */
    hasNext(): boolean {
        return this.currentIndex < this.queue.length - 1;
    }

    /**
     * Check if queue is complete
     */
    isComplete(): boolean {
        return this.currentIndex >= this.queue.length - 1;
    }

    /**
     * Get current arc position based on queue progress
     */
    getArcPosition(): ArcPosition {
        const progress = (this.currentIndex + 1) / this.queue.length;

        // Use setlist arc type if available
        if (this.setlistArcType) {
            return this.mapArcTypeToPosition(this.setlistArcType, progress);
        }

        // Default arc mapping
        if (progress < 0.15) return 'opener';
        if (progress < 0.4) return 'buildup';
        if (progress < 0.7) return 'peak';
        if (progress < 0.9) return 'cooldown';
        return 'closer';
    }

    /**
     * Adjust transition plan based on arc position
     * (Used for Cinematic AI mode)
     */
    adjustTransitionForArc(
        plan: TransitionPlan,
        arcPosition: ArcPosition,
        mode: AutoDJMode
    ): TransitionPlan {
        // Only adjust for Cinematic AI mode
        if (mode !== AutoDJMode.CINEMATIC_AI) {
            return plan;
        }

        const adjustedPlan = { ...plan };

        switch (arcPosition) {
            case 'opener':
                // Gentle, welcoming transitions
                adjustedPlan.crossfadeDuration = Math.max(plan.crossfadeDuration, 10);
                adjustedPlan.curve = 'smooth';
                break;

            case 'buildup':
                // Gradually increase intensity
                adjustedPlan.crossfadeDuration = plan.crossfadeDuration * 0.9;
                adjustedPlan.curve = 'smooth';
                break;

            case 'peak':
                // Energetic, seamless transitions
                adjustedPlan.crossfadeDuration = plan.crossfadeDuration * 0.7;
                adjustedPlan.curve = 'exponential';
                break;

            case 'cooldown':
                // Smooth wind-down
                adjustedPlan.crossfadeDuration = plan.crossfadeDuration * 1.1;
                adjustedPlan.curve = 'smooth';
                break;

            case 'closer':
                // Gentle, conclusive transitions
                adjustedPlan.crossfadeDuration = Math.max(plan.crossfadeDuration, 12);
                adjustedPlan.curve = 'smooth';
                break;
        }

        return adjustedPlan;
    }

    /**
     * Update queue with new tracks
     */
    setQueue(tracks: Track[], arcType?: string): void {
        this.queue = tracks;
        this.currentIndex = 0;
        this.setlistArcType = arcType;
    }

    /**
     * Reset queue to beginning
     */
    reset(): void {
        this.currentIndex = 0;
    }

    // Private helper methods

    private mapArcTypeToPosition(arcType: string, progress: number): ArcPosition {
        const lowerArcType = arcType.toLowerCase();

        // Map specific arc types to positions
        if (lowerArcType.includes('opener') || lowerArcType.includes('intro')) {
            return progress < 0.5 ? 'opener' : 'buildup';
        }

        if (lowerArcType.includes('peak') || lowerArcType.includes('climax')) {
            return progress < 0.3 ? 'buildup' : progress < 0.7 ? 'peak' : 'cooldown';
        }

        if (lowerArcType.includes('closer') || lowerArcType.includes('outro')) {
            return progress < 0.5 ? 'cooldown' : 'closer';
        }

        // Default progressive arc
        if (progress < 0.2) return 'opener';
        if (progress < 0.4) return 'buildup';
        if (progress < 0.7) return 'peak';
        if (progress < 0.9) return 'cooldown';
        return 'closer';
    }
}
