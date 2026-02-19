import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';

const firebaseConfig = {
	apiKey: 'AIzaSyCgzsHqI0xzlqGl6zIoU6Wso83SeYW5nvs',
	authDomain: 'klaverjas-web.firebaseapp.com',
	databaseURL: 'https://klaverjas-web-default-rtdb.europe-west1.firebasedatabase.app',
	projectId: 'klaverjas-web',
	storageBucket: 'klaverjas-web.firebasestorage.app',
	messagingSenderId: '382997326438',
	appId: '1:382997326438:web:0a3aef1d96ca4ddc081ba7'
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
