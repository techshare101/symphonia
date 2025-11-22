# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Symphonia is an AI-powered music processing platform that provides emotion-driven setlist generation, multilingual subtitles (EN/FR/ES), and comprehensive audio analysis for DJ performances. The system combines a Next.js frontend with Python microservices deployed on Google Cloud Run.

## Development Commands

### Frontend (Next.js)
```powershell
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Production server
npm start

# Lint check
npm run lint

# Lint with auto-fix
npm run lint:fix
```

### Firebase Functions
```powershell
# Navigate to functions directory
cd functions

# Build TypeScript
npm run build

# Local emulator
npm run serve

# Deploy to Firebase
npm run deploy

# View logs
npm run logs
```

### Python Microservices
Python services live in `services/` and use Docker for deployment:
- `audio-analysis/` - Audio feature extraction (BPM, key, energy) using librosa
- `lyrics-service/` - Whisper-based transcription with timestamps
- `gpt-service/` - GPT-powered translation and setlist arrangement
- `batch-controller/` - Batch processing orchestration
- `export-service/` - SRT and M3U export generation

Each service has a `requirements.txt` and `Dockerfile` for Cloud Run deployment.

## Architecture

### Frontend Architecture (Next.js 15 App Router)
- **app/** - Next.js App Router structure
  - **api/** - API routes (currently has simulate endpoints for development)
  - **components/** - Shared React components (track cards, upload forms, visualizations)
  - **providers/** - React context providers (AuthProvider for Firebase Auth)
  - **firebase/** - Firebase client config and type definitions
  - **hooks/** - Custom React hooks (useBatchProgress, useTrackProgress, usePreferences)
  - **lib/** - Core utilities (firebase.ts for client SDK initialization)
  - **tracks/** - Track management UI
  - **setlists/** - Setlist creation and management
  - **dj-mode/** - Live DJ interface with real-time transitions
  - **login/** - Authentication pages

### Backend Architecture (Firebase + Cloud Run)
1. **Upload Flow**: User uploads audio → Firebase Storage → Firestore metadata created
2. **Processing Pipeline**: 
   - Firebase Function triggers on storage upload
   - Generates signed URL for Cloud Run services
   - Calls audio-analysis service (Python/FastAPI) for feature extraction
   - Updates Firestore with BPM, key, energy, duration
   - Calls lyrics-service (Whisper) for transcription with timestamps
   - Calls gpt-service for FR/ES translation
   - Stores subtitles in Firestore and exports to Storage as .srt
3. **Setlist Generation**: 
   - Client calls `generateSetlist` callable function
   - GPT arranges tracks based on emotional arc and audio features
   - Exports .m3u playlist to Storage

### Data Flow Patterns
- **Real-time Updates**: All components use Firestore `onSnapshot` for live progress tracking
- **Processing Status**: `processing/{trackId}` documents track stage/progress
- **Track Metadata**: `tracks/{trackId}` stores audio features and status
- **Subtitles**: `subtitles/{trackId}` contains trilingual segments (EN/FR/ES)
- **Batches**: `batches/{batchId}` tracks multi-file upload progress

## Key Files and Their Purpose

### Configuration
- `.env.local` - Firebase config (Web SDK + Admin SDK), OpenAI API key, Cloud Run endpoints
- `next.config.js` - Sets up path alias `@/` → `./app/`
- `tsconfig.json` - TypeScript config with `@/*` path mapping
- `firebase.json` - Firebase project configuration (Firestore, Storage, Functions)

### Firebase Integration
- `app/lib/firebase.ts` - Firebase client SDK initialization (auth, db, storage)
- `app/firebase/types.ts` - TypeScript interfaces for processing stages, tracks, batches
- `app/firebase/utils.ts` - Firestore query utilities with collection/onSnapshot helpers
- `app/providers/AuthProvider.tsx` - Authentication context with Google sign-in

### Processing Architecture
- `functions/src/index.ts` - Main Firebase Functions entry point
  - `processTrack` - Storage trigger for new uploads
  - `onTrackReady_makeSubtitles` - Firestore trigger for subtitle generation
  - `generateSetlist` - Callable function for GPT-based arrangement
- Firebase Functions use `node-fetch` to call Cloud Run Python services with signed URLs

### Component Patterns
- Components use `useAuth()` hook for user context
- Real-time data via `onSnapshot` (see `useBatchProgress.ts` as reference)
- Error handling with `react-hot-toast` for user notifications
- Loading states tracked via Firestore `status` and `stage` fields

## Environment Setup

Required environment variables in `.env.local`:
```bash
# Firebase Web SDK (all prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

# Firebase Admin SDK (for Cloud Functions)
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

# OpenAI (for GPT services)
OPENAI_API_KEY

# Cloud Run Services
ANALYZER_URL
WHISPER_URL
ANALYZER_TOKEN
```

## Styling and UI

- **TailwindCSS** for styling with dark theme (`dark` class on `<html>`)
- Custom utility classes in `globals.css` (`.btn-primary`, `.chrome-card`, etc.)
- `@heroicons/react` for icons
- `chart.js` + `react-chartjs-2` for data visualization
- Custom particle background effect (`ParticleBackground.tsx`)

## Firebase Rules and Security

- Firestore rules: `firestore.rules`
- Storage rules: `storage.rules`
- All Firestore operations validate user ownership via `uploadedBy` field
- Hooks like `useBatchProgress` verify access before subscribing to documents

## Testing

**Note:** This codebase currently has no automated tests. When adding tests:
- Frontend: Consider using Jest + React Testing Library
- Check for test scripts before running - none exist in current `package.json`
- Backend: Firebase Functions can be tested with Firebase emulators

## Deployment Notes

- **Frontend**: Next.js app can be deployed to Vercel or self-hosted
- **Firebase Functions**: Use `firebase deploy --only functions` from `functions/` directory
- **Python Services**: Each service has a Dockerfile for Cloud Run deployment
- K8s configurations exist in `k8s/` and `helm/` directories (advanced deployment)

## Common Workflows

### Adding a New Component
1. Create in `app/components/ComponentName.tsx`
2. Use `@/` imports for internal dependencies
3. Follow existing patterns (TypeScript, dark theme, error boundaries)
4. Integrate with `useAuth()` if auth-dependent

### Modifying Processing Pipeline
1. Frontend changes: Update status UI in relevant components
2. Backend changes: Edit `functions/src/index.ts` or Python service
3. Update `app/firebase/types.ts` if adding new stages/fields
4. Ensure Firestore updates trigger UI re-renders via `onSnapshot`

### Adding Real-time Features
- Use `onSnapshot` from firebase/firestore for live updates
- See `useBatchProgress.ts` and `useTrackProgress.ts` as patterns
- Include access verification before subscribing (check `uploadedBy` field)
- Add cleanup in `useEffect` return to prevent memory leaks
