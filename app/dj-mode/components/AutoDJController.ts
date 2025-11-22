/**
 * Auto-DJ Controller
 * Handles autonomous mixing between Deck A and Deck B
 */

interface Track {
    id: string;
    duration?: number;
    cuePoints?: {
        mixIn: number;
        mixOut: number;
    };
    structure?: {
        intro?: { start: number; end: number };
        outro?: { start: number; end: number };
    };
}

interface DeckState {
    track: Track | null;
    isPlaying: boolean;
    currentTime: number;
    volume: number;
}

interface AutoDJConfig {
    crossfadeDuration: number; // seconds
    enabled: boolean;
    phraseAlign: boolean;
}

export class AutoDJController {
    private config: AutoDJConfig;
    private transitionInProgress: boolean = false;
    private monitorInterval: NodeJS.Timeout | null = null;

    constructor(config: AutoDJConfig = {
        crossfadeDuration: 8,
        enabled: false,
        phraseAlign: true
    }) {
        this.config = config;
    }

    /**
     * Start monitoring for auto-transitions
     */
    startMonitoring(
        deckA: DeckState,
        deckB: DeckState,
        audioRefA: HTMLAudioElement,
        audioRefB: HTMLAudioElement,
        onTransition: (fromDeck: 'A' | 'B', toDeck: 'A' | 'B') => void
    ) {
        if (!this.config.enabled) return;

        // Check every 500ms
        this.monitorInterval = setInterval(() => {
            this.checkForTransition(deckA, deckB, audioRefA, audioRefB, onTransition);
        }, 500);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }

    /**
     * Check if it's time to transition
     */
    private checkForTransition(
        deckA: DeckState,
        deckB: DeckState,
        audioRefA: HTMLAudioElement,
        audioRefB: HTMLAudioElement,
        onTransition: (fromDeck: 'A' | 'B', toDeck: 'A' | 'B') => void
    ) {
        if (this.transitionInProgress) return;

        // Check Deck A
        if (deckA.isPlaying && deckA.track) {
            const mixOutPoint = this.getMixOutPoint(deckA.track);
            const timeUntilMixOut = mixOutPoint - deckA.currentTime;

            // Start transition when we're crossfadeDuration seconds away
            if (timeUntilMixOut <= this.config.crossfadeDuration && timeUntilMixOut > 0) {
                this.performTransition('A', 'B', deckA, deckB, audioRefA, audioRefB, onTransition);
            }
        }

        // Check Deck B
        if (deckB.isPlaying && deckB.track) {
            const mixOutPoint = this.getMixOutPoint(deckB.track);
            const timeUntilMixOut = mixOutPoint - deckB.currentTime;

            if (timeUntilMixOut <= this.config.crossfadeDuration && timeUntilMixOut > 0) {
                this.performTransition('B', 'A', deckB, deckA, audioRefB, audioRefA, onTransition);
            }
        }
    }

    /**
     * Perform the actual transition
     */
    private async performTransition(
        fromDeck: 'A' | 'B',
        toDeck: 'A' | 'B',
        fromState: DeckState,
        toState: DeckState,
        fromAudio: HTMLAudioElement,
        toAudio: HTMLAudioElement,
        onTransition: (fromDeck: 'A' | 'B', toDeck: 'A' | 'B') => void
    ) {
        if (!toState.track) return;

        this.transitionInProgress = true;

        // Get mix-in point for the next track
        const mixInPoint = this.getMixInPoint(toState.track);

        // Start the next track at the mix-in point
        toAudio.currentTime = mixInPoint;
        toAudio.volume = 0;
        await toAudio.play();

        // Crossfade
        await this.crossfade(fromAudio, toAudio, this.config.crossfadeDuration);

        // Notify about the transition
        onTransition(fromDeck, toDeck);

        this.transitionInProgress = false;
    }

    /**
     * Crossfade between two audio elements
     */
    private async crossfade(
        fromAudio: HTMLAudioElement,
        toAudio: HTMLAudioElement,
        duration: number
    ): Promise<void> {
        const steps = 50;
        const stepDuration = (duration * 1000) / steps;
        const fromStartVolume = fromAudio.volume;
        const toEndVolume = 0.8; // Target volume

        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;

            // Smooth curve (ease-in-out)
            const curve = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            fromAudio.volume = fromStartVolume * (1 - curve);
            toAudio.volume = toEndVolume * curve;

            await new Promise(resolve => setTimeout(resolve, stepDuration));
        }

        // Pause the old track
        fromAudio.pause();
        fromAudio.volume = fromStartVolume;
    }

    /**
     * Get mix-out point for a track
     */
    private getMixOutPoint(track: Track): number {
        // Use cue point if available
        if (track.cuePoints?.mixOut) {
            return track.cuePoints.mixOut;
        }

        // Use outro start if available
        if (track.structure?.outro?.start) {
            return track.structure.outro.start;
        }

        // Default to 75% of track duration
        return (track.duration || 240) * 0.75;
    }

    /**
     * Get mix-in point for a track
     */
    private getMixInPoint(track: Track): number {
        // Use cue point if available
        if (track.cuePoints?.mixIn) {
            return track.cuePoints.mixIn;
        }

        // Use intro start if available
        if (track.structure?.intro?.start) {
            return track.structure.intro.start;
        }

        // Default to start of track
        return 0;
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<AutoDJConfig>) {
        this.config = { ...this.config, ...config };

        // Restart monitoring if enabled changed
        if (config.enabled !== undefined) {
            if (!config.enabled) {
                this.stopMonitoring();
            }
        }
    }

    /**
     * Get current config
     */
    getConfig(): AutoDJConfig {
        return { ...this.config };
    }
}
