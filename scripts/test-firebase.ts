import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testFirebaseSetup() {
  try {
    console.log('🔍 Testing Firebase Admin SDK setup...\n');

    // 1. Load service account
    console.log('1. Loading service account...');
    const serviceAccountPath = join(__dirname, '../service-account.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    console.log('✓ Service account loaded');
    console.log(`  Project: ${serviceAccount.project_id}`);

    // 2. Initialize Firebase Admin
    console.log('\n2. Initializing Firebase Admin...');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
    console.log('✓ Firebase Admin initialized');

    // 3. Test Firestore
    console.log('\n3. Testing Firestore connection...');
    const db = admin.firestore();
    const testDoc = await db.collection('test').add({
      message: 'Test connection from Symphonia',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✓ Successfully wrote to Firestore');
    console.log(`  Document ID: ${testDoc.id}`);

    // 4. Test Storage
    console.log('\n4. Testing Storage connection...');
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log('✓ Successfully connected to Storage');
    console.log(`  Bucket: ${bucket.name}`);
    if (files.length > 0) {
      console.log(`  Found ${files.length} files`);
    }

    // 5. Clean up
    console.log('\n5. Cleaning up test data...');
    await testDoc.delete();
    console.log('✓ Test document deleted');

    console.log('\n✅ All tests passed! Your Firebase setup is working correctly.');
    console.log('\nYou can now use:');
    console.log('- Storage for track uploads');
    console.log('- Firestore for track metadata');
    console.log('- Cloud Functions for processing');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\nCommon issues:');
    console.log('1. Service account file not found');
    console.log('2. Invalid service account format');
    console.log('3. Wrong project ID');
    console.log('4. Missing permissions');
    process.exit(1);
  }
}

// Run tests
testFirebaseSetup();