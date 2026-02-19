// Mock for $env/static/public in Vitest
// Values are loaded from .env by Vite automatically

export const PUBLIC_FIREBASE_API_KEY = import.meta.env.PUBLIC_FIREBASE_API_KEY ?? '';
export const PUBLIC_FIREBASE_AUTH_DOMAIN = import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN ?? '';
export const PUBLIC_FIREBASE_DATABASE_URL = import.meta.env.PUBLIC_FIREBASE_DATABASE_URL ?? '';
export const PUBLIC_FIREBASE_PROJECT_ID = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID ?? '';
export const PUBLIC_FIREBASE_STORAGE_BUCKET = import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET ?? '';
export const PUBLIC_FIREBASE_MESSAGING_SENDER_ID =
	import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '';
export const PUBLIC_FIREBASE_APP_ID = import.meta.env.PUBLIC_FIREBASE_APP_ID ?? '';
