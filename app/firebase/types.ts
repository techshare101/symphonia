// Processing stages for audio tracks
export type ProcessingStage = 
  | 'queued'
  | 'analyzing'
  | 'transcribing'
  | 'translating'
  | 'complete'
  | 'error';

// Generic status type for any process
export type ProcessStatus = 'preparing' | 'processing' | 'complete' | 'error';

// Base interface for any item with progress tracking
export interface ProgressTrackable {
  progress: number;
  status: ProcessStatus;
  error?: string;
}

// Track-specific interfaces
export interface TrackMetadata {
  filename: string;
  uploadedBy: string;
  createdAt: Date;
  size?: number;
  type?: string;
  status: ProcessStatus;
  downloadURL?: string;
}

// Minimal track type used in UI lists
export interface Track {
  id: string;
  filename: string;
  bpm?: number;
  key?: string;
}

export interface ProcessingMetadata {
  stage: ProcessingStage;
  progress: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// Batch processing interfaces
export interface BatchTrackProgress {
  id: string;
  filename: string;
  stage: ProcessingStage;
  progress: number;
  error?: string;
}

export interface BatchProgress {
  status: ProcessStatus;
  trackCount: number;
  completedTracks: number;
  tracks: Record<string, BatchTrackProgress>;
  createdAt: Date;
  updatedAt: Date;
}