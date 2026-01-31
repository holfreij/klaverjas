import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

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
