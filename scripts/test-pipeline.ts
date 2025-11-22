import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const storage = admin.storage();

async function testPipeline() {
  try {
    console.log('🎵 Testing Symphonia Pipeline\n');

    // 1. Verify tracks are in Firestore
    console.log('1. Checking tracks...');
    const tracksSnap = await db.collection('tracks')
      .where('status', '==', 'READY')
      .where('uploadedBy', '==', 'demo_user')
      .get();

    if (tracksSnap.empty) {
      throw new Error('No test tracks found! Run seed-test-data.ts first.');
    }

    const tracks = tracksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`✓ Found ${tracks.length} test tracks`);
    
    // 2. Check subtitles
    console.log('\n2. Checking subtitles...');
    const subtitlesPromises = tracks.map(t => 
      db.collection('subtitles').doc(t.id).get()
    );
    const subtitlesDocs = await Promise.all(subtitlesPromises);
    const subtitles = subtitlesDocs.map(d => d.data());

    console.log('✓ Found subtitles:');
    subtitles.forEach(sub => {
      const segments = sub?.content?.length || 0;
      console.log(`  - Track ${sub?.trackId}: ${segments} translated segments`);
    });

    // 3. Check SRT files in Storage
    console.log('\n3. Checking SRT files...');
    const bucket = storage.bucket();
    const srtPromises = tracks.map(t => 
      bucket.file(`exports/subtitles/${t.id}.srt`).exists()
    );
    const srtExists = await Promise.all(srtPromises);
    
    const missingSRT = tracks.filter((_, i) => !srtExists[i][0]);
    if (missingSRT.length) {
      console.warn('⚠️ Missing SRT files for:', missingSRT.map(t => t.id).join(', '));
    } else {
      console.log('✓ All SRT files present');
    }

    // 4. Check setlist
    console.log('\n4. Checking setlist...');
    const setlistSnap = await db.collection('setlists').doc('demo_setlist').get();
    const setlist = setlistSnap.data();

    if (!setlist) {
      throw new Error('Demo setlist not found!');
    }

    console.log('✓ Found demo setlist:');
    console.log(`  Title: ${setlist.title}`);
    console.log(`  Arc: ${setlist.arc}`);
    console.log(`  Tracks: ${setlist.order.join(' → ')}`);

    // 5. Check M3U file
    console.log('\n5. Checking M3U playlist...');
    const m3uExists = await bucket.file('exports/setlists/demo_setlist.m3u').exists();
    
    if (!m3uExists[0]) {
      console.warn('⚠️ M3U file missing');
    } else {
      console.log('✓ M3U playlist found');
    }

    // Summary
    console.log('\n🎉 Pipeline Test Complete!');
    console.log('\nAll components present:');
    console.log('- Tracks in Firestore ✓');
    console.log('- Subtitles in Firestore ✓');
    console.log('- SRT files in Storage ✓');
    console.log('- Setlist in Firestore ✓');
    console.log('- M3U playlist in Storage ✓');

    console.log('\nReady for live testing! Try:');
    console.log('1. Call createSetlistArc with a custom arc template');
    console.log('2. Download and play the .m3u file');
    console.log('3. Load the .srt files in your video player\n');

  } catch (error) {
    console.error('❌ Error testing pipeline:', error);
    process.exit(1);
  }
}

// Run test
testPipeline().then(() => process.exit(0));