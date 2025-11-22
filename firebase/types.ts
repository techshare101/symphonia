import { Timestamp } from 'firebase/firestore';

export interface Track {
  id: string;
  filename: string;
  bpm: number;
  key: string;
  energy: number;
  uploadedBy: string;
  createdAt: Timestamp;
}

export interface Lyrics {
  trackId: string;
  language: 'EN' | 'FR' | 'ES';
  content: string;
  timestamps: string[];
}

export interface Setlist {
  id: string;
  title: string;
  order: string[];
  createdBy: string;
  createdAt: Timestamp;
}

export interface SubtitleLine {
  start: string;
  end: string;
  EN: string;
  FR: string;
  ES: string;
}

export interface Subtitle {
  trackId: string;
  content: SubtitleLine[];
}

// Track processing status
export interface ProcessingStatus {
  trackId: string;
  stage: 'uploaded' | 'analyzing' | 'transcribing' | 'translating' | 'complete';
  progress: number;
  error?: string;
}