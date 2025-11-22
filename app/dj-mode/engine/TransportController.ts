/**
 * Transport Controller - Layer 1 of Auto-DJ Engine
 * 
 * Manages deck state machine, playback control, and crossfade automation.
 * Powers all 4 Auto-DJ modes (Smooth Club, High Energy, Latin Salsa, Cinematic AI).
 */

export enum DeckState {
    IDLE = 'IDLE',
    LOADING = 'LOADING',
    READY = 'READY',
    PLAYING = 'PLAYING',
    TRANSITIONING = 'TRANSITIONING',
    COMPLETE = 'COMPLETE'
}

export interface DeckStatus {
    state: DeckState;
    currentTime: number;
    duration: number;
    volume: number;
    isPlaying: boolean;
}

export type CrossfadeCurve = 'linear' | 'smooth' | 'exponential';

export class TransportController {
    private deckAState: DeckState = DeckState.IDLE;
    private deckBState: DeckState = DeckState.IDLE;
    private crossfadeInProgress = false;

    /**
     * Start playback on specified deck
     */
    async startPlayback(
        deck: 'A' | 'B',
        audioElement: HTMLAudioElement
    ): Promise<void> {
        try {
            await audioElement.play();
            this.setState(deck, DeckState.PLAYING);
        } catch (error) {
            console.error(`Failed to start playback on Deck ${deck}:`, error);
            throw error;
        }
    }

    /**
     * Pause playback on specified deck
     */
    pausePlayback(
        deck: 'A' | 'B',
        audioElement: HTMLAudioElement
    ): void {
        audioElement.pause();
        this.setState(deck, DeckState.READY);
    }

    /**
     * Set cue point (playback position) on deck
     */
    setCuePoint(
        deck: 'A' | 'B',
        audioElement: HTMLAudioElement,
        time: number
    ): void {
        audioElement.currentTime = time;
    }

    /**
     * Execute smooth crossfade from one deck to another
     * 
     * @param fromDeck - Source deck to fade out
     * @param toDeck - Target deck to fade in
     * @param fromAudio - Source audio element
     * @param toAudio - Target audio element
     * @param duration - Crossfade duration in seconds
     * @param curve - Crossfade curve type
     */
    async executeCrossfade(
        fromDeck: 'A' | 'B',
        toDeck: 'A' | 'B',
        fromAudio: HTMLAudioElement,
        toAudio: HTMLAudioElement,
        duration: number,
        curve: CrossfadeCurve = 'smooth'
    ): Promise<void> {
        if (this.crossfadeInProgress) {
            console.warn('Crossfade already in progress, skipping');
            return;
        }

        this.crossfadeInProgress = true;
        this.setState(fromDeck, DeckState.TRANSITIONING);
        this.setState(toDeck, DeckState.TRANSITIONING);

        const startVolume = fromAudio.volume;
        const targetVolume = toAudio.volume;
        const steps = 60; // 60 steps for smooth animation
        const stepDuration = (duration * 1000) / steps;

        try {
            // Start playing the incoming track if not already playing
            if (toAudio.paused) {
                await toAudio.play();
            }

            // Execute crossfade
            for (let i = 0; i <= steps; i++) {
                const progress = i / steps;
                const fadeProgress = this.applyCurve(progress, curve);

                // Fade out source deck
                fromAudio.volume = startVolume * (1 - fadeProgress);

                // Fade in target deck
                toAudio.volume = targetVolume * fadeProgress;

                await this.sleep(stepDuration);
            }

            // Pause the outgoing track
            fromAudio.pause();
            fromAudio.volume = startVolume; // Reset volume

            // Update states
            this.setState(fromDeck, DeckState.COMPLETE);
            this.setState(toDeck, DeckState.PLAYING);
        } catch (error) {
            console.error('Crossfade failed:', error);
            throw error;
        } finally {
            this.crossfadeInProgress = false;
        }
    }

    /**
     * Sync tempo between two decks (for future BPM matching)
     */
    syncTempo(
        sourceDeck: 'A' | 'B',
        targetDeck: 'A' | 'B',
        sourceAudio: HTMLAudioElement,
        targetAudio: HTMLAudioElement,
        sourceBPM: number,
        targetBPM: number
    ): void {
        // Calculate playback rate to match BPMs
        const playbackRate = targetBPM / sourceBPM;

        // Apply playback rate (clamped between 0.5x and 2x for safety)
        targetAudio.playbackRate = Math.max(0.5, Math.min(2.0, playbackRate));
    }

    /**
     * Load next track into deck
     */
    async loadNextTrack(
        deck: 'A' | 'B',
        audioElement: HTMLAudioElement,
        audioSrc: string
    ): Promise<void> {
        this.setState(deck, DeckState.LOADING);

        return new Promise((resolve, reject) => {
            audioElement.src = audioSrc;

            audioElement.onloadeddata = () => {
                this.setState(deck, DeckState.READY);
                resolve();
            };

            audioElement.onerror = (error) => {
                this.setState(deck, DeckState.IDLE);
                reject(error);
            };

            audioElement.load();
        });
    }

    /**
     * Get current state of a deck
     */
    getState(deck: 'A' | 'B'): DeckState {
        return deck === 'A' ? this.deckAState : this.deckBState;
    }

    /**
     * Get status of a deck
     */
    getStatus(deck: 'A' | 'B', audioElement: HTMLAudioElement): DeckStatus {
        return {
            state: this.getState(deck),
            currentTime: audioElement.currentTime,
            duration: audioElement.duration,
            volume: audioElement.volume,
            isPlaying: !audioElement.paused
        };
    }

    /**
     * Reset deck to idle state
     */
    reset(deck: 'A' | 'B', audioElement: HTMLAudioElement): void {
        audioElement.pause();
        audioElement.currentTime = 0;
        this.setState(deck, DeckState.IDLE);
    }

    // Private helper methods

    private setState(deck: 'A' | 'B', state: DeckState): void {
        if (deck === 'A') {
            this.deckAState = state;
        } else {
            this.deckBState = state;
        }
    }

    private applyCurve(progress: number, curve: CrossfadeCurve): number {
        switch (curve) {
            case 'linear':
                return progress;

            case 'smooth':
                // Smooth S-curve (ease-in-out)
                return progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            case 'exponential':
                // Exponential curve (fast start, slow end)
                return Math.pow(progress, 2);

            default:
                return progress;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
