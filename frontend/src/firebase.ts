import { initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

const config = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID };
let auth: Auth | null = null;

export function getAuthClient() {
  if (!config.apiKey) return null;
  auth ??= getAuth(initializeApp(config));
  return auth;

  // Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB9sTmodU7erW3hLe_e84JJ3kKTxaZ0TaI",
  authDomain: "alpha-pit-display.firebaseapp.com",
  projectId: "alpha-pit-display",
  storageBucket: "alpha-pit-display.firebasestorage.app",
  messagingSenderId: "306702827652",
  appId: "1:306702827652:web:b2adc8a557a81a4ed0c2d1",
  measurementId: "G-RD0Z9Y6PG4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
}

