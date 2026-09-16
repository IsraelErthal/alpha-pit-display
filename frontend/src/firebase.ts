import { initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

const config = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID };
let auth: Auth | null = null;

export function getAuthClient() {
  if (!config.apiKey) return null;
  auth ??= getAuth(initializeApp(config));
  return auth;
}
