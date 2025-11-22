import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  // Try loading from service account first
  try {
    const serviceAccount = require('../../../service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    // Fallback to default credentials (when deployed)
    admin.initializeApp();
  }
}

// Get config values
const cfg = functions.config();

// Firebase config
export const firebaseConfig = {
  projectId: cfg?.firebase?.project_id || process.env.FIREBASE_PROJECT_ID,
  storageBucket: cfg?.firebase?.storage_bucket || process.env.FIREBASE_STORAGE_BUCKET
};

// Initialize services
export const db = admin.firestore();
export const storage = admin.storage();

// Service endpoints
export const serviceConfig = {
  analyzerUrl: cfg?.symphonia?.analyzer_url || process.env.ANALYZER_URL,
  analyzerToken: cfg?.symphonia?.analyzer_token || process.env.ANALYZER_TOKEN,
  whisperUrl: cfg?.symphonia?.whisper_url || process.env.WHISPER_URL,
  openaiKey: cfg?.symphonia?.openai_key || process.env.OPENAI_API_KEY
};