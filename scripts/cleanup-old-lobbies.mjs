#!/usr/bin/env node

/**
 * Deletes lobbies older than 30 days from Firebase Realtime Database.
 * Used by the GitHub Actions cleanup-lobbies workflow.
 *
 * Requires firebase-tools to be installed and authenticated
 * (via FIREBASE_TOKEN env var or `firebase login`).
 */

import { execSync } from 'child_process';

const MAX_AGE_DAYS = 30;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const PROJECT = 'klaverjas-web';

const cutoff = Date.now() - MAX_AGE_MS;

// Fetch all lobbies (shallow would be faster but doesn't include createdAt)
let result;
try {
	result = execSync(`npx firebase-tools database:get /lobbies --project ${PROJECT}`, {
		encoding: 'utf-8',
		timeout: 30000
	});
} catch (error) {
	console.error('Failed to fetch lobbies:', error.message);
	process.exit(1);
}

// Strip non-JSON lines (e.g. firebase-tools deprecation warnings) from output
const jsonStart = result.indexOf('{');
const cleanResult = jsonStart !== -1 ? result.slice(jsonStart) : result.trim();

if (!cleanResult || cleanResult === 'null') {
	console.log('No lobbies found, nothing to clean up.');
	process.exit(0);
}

const lobbies = JSON.parse(cleanResult);
const codes = Object.keys(lobbies);
let deleted = 0;

for (const code of codes) {
	const lobby = lobbies[code];
	if (lobby.createdAt && lobby.createdAt < cutoff) {
		const age = Math.floor((Date.now() - lobby.createdAt) / (24 * 60 * 60 * 1000));
		console.log(`Deleting lobby ${code} (${age} days old)`);
		try {
			execSync(`npx firebase-tools database:remove /lobbies/${code} --force --project ${PROJECT}`, {
				encoding: 'utf-8',
				timeout: 10000
			});
			deleted++;
		} catch (error) {
			console.error(`Failed to delete lobby ${code}:`, error.message);
		}
	}
}

console.log(`Done. Deleted ${deleted} of ${codes.length} lobbies.`);
