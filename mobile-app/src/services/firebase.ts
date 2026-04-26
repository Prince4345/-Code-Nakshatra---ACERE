import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'your_firebase_web_api_key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'https://your-project-default-rtdb.firebaseio.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your_messaging_sender_id',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'your_firebase_app_id',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
