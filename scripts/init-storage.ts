import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

async function initializeStorage() {
  try {
    console.log('🔧 Initializing Firebase Storage...\n');

    // 1. Load service account
    console.log('1. Loading service account...');
    const serviceAccountPath = join(__dirname, '../service-account.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    console.log('✓ Service account loaded');

    // 2. Initialize Firebase Admin
    console.log('\n2. Initializing Firebase Admin...');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
    console.log('✓ Firebase Admin initialized');

    // 3. Create default bucket
    console.log('\n3. Creating default storage bucket...');
    const storage = admin.storage();
    const bucketName = `${serviceAccount.project_id}.appspot.com`;
    
    try {
      const [bucket] = await storage.createBucket(bucketName, {
        location: 'us-central1',
        storageClass: 'STANDARD'
      });
      console.log(`✓ Created bucket: ${bucket.name}`);
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Bucket already exists (this is fine)');
      } else {
        throw error;
      }
    }

    // 4. Create initial folders
    console.log('\n4. Creating folder structure...');
    const bucket = storage.bucket(bucketName);
    const folders = [
      'tracks/',
      'exports/',
      'exports/subtitles/',
      'exports/setlists/'
    ];

    for (const folder of folders) {
      const file = bucket.file(folder);
      try {
        await file.save(''); // Create empty file to ensure folder exists
        console.log(`  ✓ Created: ${folder}`);
      } catch (error) {
        console.log(`  ℹ Folder exists: ${folder}`);
      }
    }

    console.log('\n✅ Storage initialization complete!');
    console.log('\nBucket details:');
    console.log(`- Name: ${bucketName}`);
    console.log('- Location: us-central1');
    console.log('- Class: STANDARD');
    console.log('\nFolder structure:');
    console.log('└─ tracks/         (user uploads)');
    console.log('└─ exports/');
    console.log('   ├─ subtitles/   (SRT files)');
    console.log('   └─ setlists/    (M3U playlists)');

  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    console.log('\nPossible issues:');
    console.log('1. Missing permissions');
    console.log('2. Invalid service account');
    console.log('3. Project not properly set up');
    process.exit(1);
  }
}

// Run initialization
initializeStorage();