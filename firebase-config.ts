import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

export const getFirebaseConfig = () => {
  return {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || '(default)',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
  };
};
