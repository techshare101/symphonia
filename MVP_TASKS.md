# MVP Tasks

## 1. Project Setup
- [x] Initialize Next.js frontend
- [x] Set up Firebase configuration
- [x] Create Firestore schema for tracks, lyrics, setlists
- [x] Configure Firebase Storage for audio uploads

## 2. Upload & Analysis Pipeline
- [x] Implement track upload UI (UploadForm component)
- [x] Set up Firebase Storage upload flow
- [ ] Create Cloud Run microservice for Librosa analysis
  ```python
  # audio_analysis/main.py
  def analyze_track(audio_file):
      return {
          "bpm": detect_bpm(audio_file),
          "key": detect_key(audio_file),
          "energy": calculate_energy(audio_file)
      }
  ```

## 3. AI Processing Pipeline
- [ ] Implement Whisper integration for EN lyrics
  ```typescript
  // functions/src/whisper.ts
  export async function transcribeAudio(audioUrl: string): Promise<string> {
      const response = await whisperApi.transcribe({
          audio: audioUrl,
          language: "en"
      });
      return response.text;
  }
  ```
- [ ] Add GPT-5 for FR/ES translations
  ```typescript
  // functions/src/translations.ts
  export async function translateLyrics(
      lyrics: string,
      targetLangs: ["FR", "ES"]
  ): Promise<Record<string, string>> {
      // GPT-5 translation with music context
  }
  ```

## 4. Narrative Arc Generation
- [ ] Implement GPT-5 setlist arranger
  ```typescript
  // functions/src/setlist.ts
  export async function createNarrativeArc(
      tracks: Track[],
      arcTemplate: "heartbreak" | "rising" | "custom"
  ): Promise<string[]> {
      // GPT-5 arranges tracks into emotional journey
  }
  ```
- [ ] Add real-time progress tracking in Firestore

## 5. Export System
- [x] Create .m3u playlist generator
- [x] Implement .srt subtitle export
- [ ] Add batch export functionality
  ```typescript
  // functions/src/export.ts
  export async function generateExportPackage(
      setlistId: string
  ): Promise<string> {
      // Create ZIP with .m3u + .srt files
  }
  ```

## 6. Demo & Testing
- [x] Create demo playlist with 5 tracks
- [x] Generate EN/FR/ES subtitle examples
- [ ] Build stage demo interface

## 7. Production Readiness
- [ ] Set up Firebase security rules
  ```typescript
  // firestore.rules
  rules_version = '2';
  service cloud.firestore {
      match /databases/{database}/documents {
          match /tracks/{trackId} {
              allow read: if request.auth != null;
              allow write: if request.auth.uid == resource.data.uploadedBy;
          }
      }
  }
  ```
- [ ] Implement error handling & retry logic
- [ ] Add usage monitoring & quotas
