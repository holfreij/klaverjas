/**
 * Player session management.
 * Handles local storage of session data and reconnection.
 */

import type { LocalSession } from './types';

const SESSION_KEY = 'klaverjas_session';

/**
 * Save session to local storage.
 */
export function saveSession(session: LocalSession): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Load session from local storage.
 */
export function loadSession(): LocalSession | null {
	if (typeof localStorage === 'undefined') return null;

	const data = localStorage.getItem(SESSION_KEY);
	if (!data) return null;

	try {
		return JSON.parse(data) as LocalSession;
	} catch {
		return null;
	}
}

/**
 * Clear session from local storage.
 */
export function clearSession(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(SESSION_KEY);
}

/**
 * Check if a session exists.
 */
export function hasSession(): boolean {
	return loadSession() !== null;
}
