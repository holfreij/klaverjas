/**
 * Firebase configuration and initialization.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
	apiKey: 'AIzaSyCgzsHqI0xzlqGl6zIoU6Wso83SeYW5nvs',
	authDomain: 'klaverjas-web.firebaseapp.com',
	databaseURL: 'https://klaverjas-web-default-rtdb.europe-west1.firebasedatabase.app',
	projectId: 'klaverjas-web',
	storageBucket: 'klaverjas-web.firebasestorage.app',
	messagingSenderId: '382997326438',
	appId: '1:382997326438:web:0a3aef1d96ca4ddc081ba7',
};

let app: FirebaseApp | null = null;
let database: Database | null = null;

/**
 * Initialize Firebase app and database.
 * Safe to call multiple times - will return existing instance.
 */
export function initFirebase(): { app: FirebaseApp; database: Database } {
	if (!app) {
		app = initializeApp(firebaseConfig);
	}
	if (!database) {
		database = getDatabase(app);
	}
	return { app, database };
}

/**
 * Get the Firebase database instance.
 * Throws if Firebase hasn't been initialized.
 */
export function getDb(): Database {
	if (!database) {
		throw new Error('Firebase not initialized. Call initFirebase() first.');
	}
	return database;
}
