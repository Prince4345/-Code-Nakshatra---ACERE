import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your_firebase_web_api_key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://your-project-default-rtdb.firebaseio.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your_messaging_sender_id",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "your_firebase_app_id",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "your_measurement_id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1");
