/**
 * Auto-DJ Master Controller
 * 
 * Orchestrates all 3 layers of the Auto-DJ engine:
 * - Transport Controller (playback)
 * - Transition Engine (intelligence)
 * - Queue Navigator (progression)
 */

import { TransportController, DeckState } from './TransportController';
import { TransitionEngine } from './TransitionEngine';
import { QueueNavigator, ArcPosition } from './QueueNavigator';
import { Track, AutoDJMode, TransitionPlan } from './types';

export interface AutoDJConfig {
    mode: AutoDJMode;
    enabled: boolean;
    onTransition?: (fromDeck: 'A' | 'B', toDeck: 'A' | 'B') => void;
    onTrackChange?: (track: Track, deck: 'A' | 'B') => void;
    onComplete?: () => void;
}

export class AutoDJMasterController {
    private transport: TransportController;
    private transitionEngine: TransitionEngine;
    private queueNavigator: QueueNavigator;

    private config: AutoDJConfig;
    private isRunning = false;
    private monitorInterval?: NodeJS.Timeout;

    constructor(config: AutoDJConfig) {
        this.transport = new TransportController();
        this.transitionEngine = new TransitionEngine();
        this.queueNavigator = new QueueNavigator();
        this.config = config;
    }

    /**
     * Start Auto-DJ mode
     */
    async start(
        queue: Track[],
        arcType: string | undefined,
        audioRefA: HTMLAudioElement,
        audioRefB: HTMLAudioElement,
        onDeckAUpdate: (track: Track) => void,
        onDeckBUpdate: (track: Track) => void
    ): Promise<void> {
        if (this.isRunning) {
            console.warn('Auto-DJ already running');
            return;
        }

        // Initialize queue
        this.queueNavigator.setQueue(queue, arcType);

        // Load first two tracks
        const track1 = this.queueNavigator.getCurrentTrack();
        const track2 = this.queueNavigator.getNextTrack();

        if (!track1) {
            console.error('No tracks in queue');
            return;
        }

        // Load Track 1 to Deck A
        const audioSrc1 = track1.downloadURL || '';
        await this.transport.loadNextTrack('A', audioRefA, audioSrc1);
        onDeckAUpdate(track1);

        // Load Track 2 to Deck B (if available)
        if (track2) {
            const audioSrc2 = track2.downloadURL || '';
            await this.transport.loadNextTrack('B', audioRefB, audioSrc2);
            onDeckBUpdate(track2);
        }

        // Start playback on Deck A
        await this.transport.startPlayback('A', audioRefA);
        this.config.onTrackChange?.(track1, 'A');

        // Start monitoring for transitions
        this.isRunning = true;
        this.startMonitoring(audioRefA, audioRefB, onDeckAUpdate, onDeckBUpdate);
    }

    /**
     * Stop Auto-DJ mode
     */
    stop(): void {
        this.isRunning = false;
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = undefined;
        }
    }

    /**
     * Update Auto-DJ mode
     */
    setMode(mode: AutoDJMode): void {
        this.config.mode = mode;
    }

    /**
     * Check if Auto-DJ is running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    // Private methods

    private startMonitoring(
        audioRefA: HTMLAudioElement,
        audioRefB: HTMLAudioElement,
        onDeckAUpdate: (track: Track) => void,
        onDeckBUpdate: (track: Track) => void
    ): void {
        // Monitor every 500ms
        this.monitorInterval = setInterval(() => {
            this.checkForTransition(audioRefA, audioRefB, onDeckAUpdate, onDeckBUpdate);
        }, 500);
    }

    private async checkForTransition(
        audioRefA: HTMLAudioElement,
        audioRefB: HTMLAudioElement,
        onDeckAUpdate: (track: Track) => void,
        onDeckBUpdate: (track: Track) => void
    ): Promise<void> {
        if (!this.isRunning) return;

        const statusA = this.transport.getStatus('A', audioRefA);
        const statusB = this.transport.getStatus('B', audioRefB);

        // Determine which deck is playing
        const playingDeck = statusA.isPlaying ? 'A' : statusB.isPlaying ? 'B' : null;
        if (!playingDeck) return;

        const playingAudio = playingDeck === 'A' ? audioRefA : audioRefB;
        const waitingDeck = playingDeck === 'A' ? 'B' : 'A';
        const waitingAudio = playingDeck === 'A' ? audioRefB : audioRefA;

        // Get current and next tracks
        const currentTrack = this.queueNavigator.getCurrentTrack();
        const nextTrack = this.queueNavigator.getNextTrack();

        if (!currentTrack || !nextTrack) {
            // End of queue
            if (this.queueNavigator.isComplete()) {
                this.stop();
                this.config.onComplete?.();
            }
            return;
        }

        // Calculate transition plan
        const transitionPlan = this.transitionEngine.calculateTransitionPoint(
            currentTrack,
            nextTrack,
            this.config.mode
        );

        // Adjust for arc position (Cinematic AI mode)
        const arcPosition = this.queueNavigator.getArcPosition();
        const adjustedPlan = this.queueNavigator.adjustTransitionForArc(
            transitionPlan,
            arcPosition,
            this.config.mode
        );

        // Check if it's time to transition
        const timeUntilMixOut = adjustedPlan.mixOutPoint - playingAudio.currentTime;

        if (timeUntilMixOut <= 0 && timeUntilMixOut > -1) {
            // Time to transition!
            await this.executeTransition(
                playingDeck,
                waitingDeck,
                playingAudio,
                waitingAudio,
                adjustedPlan,
                nextTrack,
                onDeckAUpdate,
                onDeckBUpdate
            );
        }
    }

    private async executeTransition(
        fromDeck: 'A' | 'B',
        toDeck: 'A' | 'B',
        fromAudio: HTMLAudioElement,
        toAudio: HTMLAudioElement,
        plan: TransitionPlan,
        nextTrack: Track,
        onDeckAUpdate: (track: Track) => void,
        onDeckBUpdate: (track: Track) => void
    ): Promise<void> {
        try {
            // Set cue point for incoming track
            this.transport.setCuePoint(toDeck, toAudio, plan.mixInPoint);

            // Execute crossfade
            await this.transport.executeCrossfade(
                fromDeck,
                toDeck,
                fromAudio,
                toAudio,
                plan.crossfadeDuration,
                plan.curve
            );

            // Notify transition
            this.config.onTransition?.(fromDeck, toDeck);
            this.config.onTrackChange?.(nextTrack, toDeck);

            // Advance queue
            this.queueNavigator.advanceQueue();

            // Load next track into the now-empty deck
            const upcomingTrack = this.queueNavigator.getNextTrack();
            if (upcomingTrack) {
                const audioSrc = upcomingTrack.downloadURL || '';
                await this.transport.loadNextTrack(fromDeck, fromAudio, audioSrc);

                if (fromDeck === 'A') {
                    onDeckAUpdate(upcomingTrack);
                } else {
                    onDeckBUpdate(upcomingTrack);
                }
            }
        } catch (error) {
            console.error('Transition failed:', error);
        }
    }
}
