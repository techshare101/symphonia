import * as admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const storage = admin.storage();

const testTracks = [
  {
    id: 'track1',
    filename: 'When Love Was Young.mp3',
    storagePath: 'tracks/demo/when-love-was-young.mp3',
    uploadedBy: 'demo_user',
    status: 'READY',
    bpm: 128,
    key: 'Am',
    energyRms: 0.75,
    durationSec: 218,
    lyricThemes: ['love', 'nostalgia', 'heartbreak'],
    subtitlesReady: true
  },
  {
    id: 'track2',
    filename: 'Silent Reflections.mp3',
    storagePath: 'tracks/demo/silent-reflections.mp3',
    uploadedBy: 'demo_user',
    status: 'READY',
    bpm: 92,
    key: 'Fm',
    energyRms: 0.45,
    durationSec: 195,
    lyricThemes: ['reflection', 'solitude', 'healing'],
    subtitlesReady: true
  },
  {
    id: 'track3',
    filename: 'Rising Phoenix.mp3',
    storagePath: 'tracks/demo/rising-phoenix.mp3',
    uploadedBy: 'demo_user',
    status: 'READY',
    bpm: 140,
    key: 'C',
    energyRms: 0.82,
    durationSec: 242,
    lyricThemes: ['hope', 'strength', 'rebirth'],
    subtitlesReady: true
  },
  {
    id: 'track4',
    filename: 'Electric Dreams.mp3',
    storagePath: 'tracks/demo/electric-dreams.mp3',
    uploadedBy: 'demo_user',
    status: 'READY',
    bpm: 135,
    key: 'G',
    energyRms: 0.88,
    durationSec: 198,
    lyricThemes: ['euphoria', 'freedom', 'energy'],
    subtitlesReady: true
  },
  {
    id: 'track5',
    filename: 'Starlit Memories.mp3',
    storagePath: 'tracks/demo/starlit-memories.mp3',
    uploadedBy: 'demo_user',
    status: 'READY',
    bpm: 110,
    key: 'Dm',
    energyRms: 0.62,
    durationSec: 225,
    lyricThemes: ['memories', 'peace', 'resolution'],
    subtitlesReady: true
  }
];

const testSubtitles = [
  {
    trackId: 'track1',
    content: [
      {
        start: '00:00:05,000',
        end: '00:00:10,000',
        EN: 'When love was young and hearts were free',
        FR: 'Quand l\'amour était jeune et les cœurs étaient libres',
        ES: 'Cuando el amor era joven y los corazones eran libres'
      },
      {
        start: '00:00:11,000',
        end: '00:00:16,000',
        EN: 'Dancing in the summer breeze',
        FR: 'Dansant dans la brise d\'été',
        ES: 'Bailando en la brisa del verano'
      }
    ]
  },
  {
    trackId: 'track2',
    content: [
      {
        start: '00:00:04,000',
        end: '00:00:09,000',
        EN: 'In silence I find my truth',
        FR: 'Dans le silence je trouve ma vérité',
        ES: 'En el silencio encuentro mi verdad'
      },
      {
        start: '00:00:10,000',
        end: '00:00:15,000',
        EN: 'Echoes of yesterday fade away',
        FR: 'Les échos d\'hier s\'estompent',
        ES: 'Los ecos de ayer se desvanecen'
      }
    ]
  },
  {
    trackId: 'track3',
    content: [
      {
        start: '00:00:06,000',
        end: '00:00:11,000',
        EN: 'Rising from the ashes of doubt',
        FR: 'S\'élevant des cendres du doute',
        ES: 'Levantándome de las cenizas de la duda'
      },
      {
        start: '00:00:12,000',
        end: '00:00:17,000',
        EN: 'Finding strength to carry on',
        FR: 'Trouvant la force de continuer',
        ES: 'Encontrando fuerza para seguir adelante'
      }
    ]
  },
  {
    trackId: 'track4',
    content: [
      {
        start: '00:00:05,000',
        end: '00:00:10,000',
        EN: 'Electric dreams light up the night',
        FR: 'Les rêves électriques illuminent la nuit',
        ES: 'Los sueños eléctricos iluminan la noche'
      },
      {
        start: '00:00:11,000',
        end: '00:00:16,000',
        EN: 'Dancing till the morning light',
        FR: 'Dansant jusqu\'à la lumière du matin',
        ES: 'Bailando hasta la luz de la mañana'
      }
    ]
  },
  {
    trackId: 'track5',
    content: [
      {
        start: '00:00:07,000',
        end: '00:00:12,000',
        EN: 'Under starlit skies we heal',
        FR: 'Sous les cieux étoilés nous guérissons',
        ES: 'Bajo cielos estrellados sanamos'
      },
      {
        start: '00:00:13,000',
        end: '00:00:18,000',
        EN: 'Memories find their peace at last',
        FR: 'Les souvenirs trouvent enfin leur paix',
        ES: 'Los recuerdos encuentran su paz al fin'
      }
    ]
  }
];

async function seedTestData() {
  try {
    // Create test tracks
    const batch = db.batch();
    testTracks.forEach(track => {
      const ref = db.collection('tracks').doc(track.id);
      batch.set(ref, {
        ...track,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    console.log('✓ Tracks created');

    // Create subtitles
    const subtitlesBatch = db.batch();
    testSubtitles.forEach(sub => {
      const ref = db.collection('subtitles').doc(sub.trackId);
      subtitlesBatch.set(ref, {
        ...sub,
        ownerId: 'demo_user',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    await subtitlesBatch.commit();
    console.log('✓ Subtitles created');

    // Generate and upload SRT files
    const bucket = storage.bucket();
    for (const sub of testSubtitles) {
      const srtContent = sub.content.map((seg, i) => {
        const idx = i + 1;
        return [
          `${idx}`,
          `${seg.start} --> ${seg.end}`,
          `EN: ${seg.EN}`,
          `FR: ${seg.FR}`,
          `ES: ${seg.ES}`,
          ''
        ].join('\n');
      }).join('\n');

      const file = bucket.file(`exports/subtitles/${sub.trackId}.srt`);
      await file.save(Buffer.from(srtContent, 'utf-8'), {
        contentType: 'application/x-subrip'
      });
    }
    console.log('✓ SRT files uploaded');

    // Create a test setlist
    const setlistRef = db.collection('setlists').doc('demo_setlist');
    await setlistRef.set({
      title: 'Journey of the Heart',
      arc: 'Heartbreak -> Reflection -> Rising Hope -> Climax -> Afterglow',
      order: ['track1', 'track2', 'track3', 'track4', 'track5'],
      rationale: 'A journey from heartbreak through reflection to newfound strength, culminating in euphoric release and peaceful resolution.',
      createdBy: 'demo_user',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✓ Demo setlist created');

    // Generate and upload M3U file
    const m3uContent = [
      '#EXTM3U',
      ...testTracks.map(t => {
        const duration = Math.round(t.durationSec);
        return `#EXTINF:${duration},${t.filename}\n${t.storagePath}`;
      })
    ].join('\n');

    const m3uFile = bucket.file('exports/setlists/demo_setlist.m3u');
    await m3uFile.save(Buffer.from(m3uContent, 'utf-8'), {
      contentType: 'audio/x-mpegurl'
    });
    console.log('✓ M3U playlist uploaded');

    console.log('\nTest data seeding complete! 🎉');
    console.log('\nTest tracks created with IDs:', testTracks.map(t => t.id).join(', '));
    console.log('Demo setlist created with ID: demo_setlist');
    console.log('\nYou can now test the pipeline with these tracks!');

  } catch (error) {
    console.error('Error seeding test data:', error);
    process.exit(1);
  }
}

// Run seeding
seedTestData().then(() => process.exit(0));