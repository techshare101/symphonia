# Symphonia Test Scripts

This directory contains scripts for testing the Symphonia pipeline with demo data.

## Setup

1. Place your Firebase service account key in:
```
../service-account.json
```

2. Install dependencies:
```bash
npm install firebase-admin typescript ts-node
```

## Scripts

### 1. Seed Test Data

`seed-test-data.ts` creates a complete set of test data including:

- 5 test tracks in Firestore
- Multilingual subtitles (EN/FR/ES)
- SRT files in Storage
- Demo setlist with narrative arc
- M3U playlist

Run:
```bash
npx ts-node seed-test-data.ts
```

### 2. Test Pipeline

`test-pipeline.ts` verifies all components of the system are working:

- Checks tracks in Firestore
- Validates subtitles
- Confirms SRT files exist
- Checks setlist configuration
- Verifies M3U playlist

Run:
```bash
npx ts-node test-pipeline.ts
```

## Demo Data Overview

Test tracks follow an emotional arc:

1. "When Love Was Young" - Heartbreak phase (128 BPM, Am)
2. "Silent Reflections" - Reflection phase (92 BPM, Fm)
3. "Rising Phoenix" - Rising Hope phase (140 BPM, C)
4. "Electric Dreams" - Climax phase (135 BPM, G)
5. "Starlit Memories" - Afterglow phase (110 BPM, Dm)

Each track includes:
- Audio analysis (BPM, key, energy)
- Timestamped lyrics
- Translations (EN/FR/ES)
- SRT subtitles

The demo setlist "Journey of the Heart" arranges these tracks into a narrative arc:
```
Heartbreak -> Reflection -> Rising Hope -> Climax -> Afterglow
```

## Testing Live Features

After seeding data, you can test:

1. Create new setlist arc:
```http
POST /createSetlistArc
{
  "title": "Custom Arc",
  "arc": "Darkness -> Light -> Transcendence",
  "trackIds": ["track1", "track2", "track3", "track4", "track5"]
}
```

2. Get generated files:
- M3U playlist: `exports/setlists/demo_setlist.m3u`
- SRT files: `exports/subtitles/{trackId}.srt`

3. Test with media player:
- Load the M3U playlist
- Enable SRT subtitles
- Verify translations appear correctly