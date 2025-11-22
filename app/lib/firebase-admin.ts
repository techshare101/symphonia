import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(require('@/../service-account.json')),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

export const db = admin.firestore();
export const storage = admin.storage();
