import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_DATABASE_URL,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_STORAGE_BUCKET,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_APP_ID
} from '$env/static/public';

const firebaseConfig = {
	apiKey: PUBLIC_FIREBASE_API_KEY,
	authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
	databaseURL: PUBLIC_FIREBASE_DATABASE_URL,
	projectId: PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp;
let database: Database;
let auth: Auth;

export function getFirebaseApp(): FirebaseApp {
	if (!app) {
		const existingApps = getApps();
		app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
	}
	return app;
}

export function getFirebaseDatabase(): Database {
	if (!database) {
		database = getDatabase(getFirebaseApp());
	}
	return database;
}

export function getFirebaseAuth(): Auth {
	if (!auth) {
		auth = getAuth(getFirebaseApp());
	}
	return auth;
}

/**
 * Signs in anonymously (idempotent — returns existing UID if already signed in).
 * Returns the Firebase UID which becomes the player ID.
 */
export async function ensureAuth(): Promise<string> {
	const firebaseAuth = getFirebaseAuth();
	if (firebaseAuth.currentUser) {
		return firebaseAuth.currentUser.uid;
	}
	const credential = await signInAnonymously(firebaseAuth);
	return credential.user.uid;
}
