/**
 * Unit tests for lobbyService functions that mock Firebase.
 * These complement the integration tests (which require Firebase connectivity).
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock Firebase modules
vi.mock('firebase/database', () => ({
	ref: vi.fn(() => 'mockRef'),
	get: vi.fn(),
	set: vi.fn(),
	update: vi.fn(),
	remove: vi.fn(),
	onValue: vi.fn(),
	onDisconnect: vi.fn(() => ({
		update: vi.fn()
	})),
	serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP')
}));

vi.mock('$lib/multiplayer/firebase', () => ({
	getFirebaseDatabase: vi.fn(() => 'mockDb')
}));

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
})();

vi.stubGlobal('localStorage', localStorageMock);

// Import after mocking
import {
	saveSession,
	getSession,
	clearSession,
	reconnect,
	subscribeLobby,
	updatePlayerStatus
} from '$lib/multiplayer/lobbyService';
import { get, onValue, update } from 'firebase/database';
import type { Lobby, Player, PlayerSeat } from '$lib/multiplayer/types';

// Helper to create test player
function createPlayer(name: string, seat: PlayerSeat | 'table'): Player {
	return {
		name,
		seat,
		connected: true,
		lastSeen: Date.now()
	};
}

// Helper to create test lobby
function createLobby(code: string, hostId: string, players: Record<string, Player>): Lobby {
	return {
		code,
		host: hostId,
		createdAt: Date.now(),
		status: 'waiting',
		players,
		game: null
	};
}

describe('lobbyService unit tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
	});

	describe('Session Management', () => {
		describe('saveSession', () => {
			it('should save session data to localStorage', () => {
				saveSession({
					playerId: 'p1',
					lobbyCode: '123456',
					playerName: 'TestPlayer'
				});

				const stored = localStorageMock.getItem('klaverjas_session');
				expect(stored).not.toBe(null);
				const parsed = JSON.parse(stored!);
				expect(parsed.playerId).toBe('p1');
				expect(parsed.lobbyCode).toBe('123456');
				expect(parsed.playerName).toBe('TestPlayer');
			});
		});

		describe('getSession', () => {
			it('should return null when no session exists', () => {
				expect(getSession()).toBe(null);
			});

			it('should return session data when it exists', () => {
				localStorageMock.setItem(
					'klaverjas_session',
					JSON.stringify({
						playerId: 'p1',
						lobbyCode: '123456',
						playerName: 'Test'
					})
				);

				const session = getSession();
				expect(session).not.toBe(null);
				expect(session?.playerId).toBe('p1');
			});

			it('should return null for invalid JSON', () => {
				localStorageMock.setItem('klaverjas_session', 'not valid json');

				expect(getSession()).toBe(null);
			});

			it('should return null for empty string', () => {
				localStorageMock.setItem('klaverjas_session', '');

				expect(getSession()).toBe(null);
			});
		});

		describe('clearSession', () => {
			it('should remove session from localStorage', () => {
				localStorageMock.setItem('klaverjas_session', 'some data');

				clearSession();

				expect(localStorageMock.getItem('klaverjas_session')).toBe(null);
			});
		});
	});

	describe('reconnect', () => {
		it('should return error when no session exists', async () => {
			const result = await reconnect();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Geen sessie gevonden');
		});

		it('should return error and clear session when lobby does not exist', async () => {
			saveSession({
				playerId: 'p1',
				lobbyCode: '123456',
				playerName: 'Test'
			});

			(get as Mock).mockResolvedValue({
				exists: () => false
			});

			const result = await reconnect();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Lobby bestaat niet meer');
			expect(getSession()).toBe(null);
		});

		it('should return error and clear session when player not in lobby', async () => {
			saveSession({
				playerId: 'nonexistent',
				lobbyCode: '123456',
				playerName: 'Test'
			});

			const lobby = createLobby('123456', 'p1', {
				p1: createPlayer('Host', 0)
			});

			(get as Mock).mockResolvedValue({
				exists: () => true,
				val: () => lobby
			});

			const result = await reconnect();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Speler niet gevonden in lobby');
			expect(getSession()).toBe(null);
		});

		it('should successfully reconnect when session and player are valid', async () => {
			saveSession({
				playerId: 'p1',
				lobbyCode: '123456',
				playerName: 'Host'
			});

			const lobby = createLobby('123456', 'p1', {
				p1: createPlayer('Host', 0)
			});

			(get as Mock).mockResolvedValue({
				exists: () => true,
				val: () => lobby
			});
			(update as Mock).mockResolvedValue(undefined);

			const result = await reconnect();

			expect(result.success).toBe(true);
			expect(result.lobby).toEqual(lobby);
			expect(result.playerId).toBe('p1');
		});

		it('should update player status on successful reconnect', async () => {
			saveSession({
				playerId: 'p1',
				lobbyCode: '123456',
				playerName: 'Host'
			});

			const lobby = createLobby('123456', 'p1', {
				p1: createPlayer('Host', 0)
			});

			(get as Mock).mockResolvedValue({
				exists: () => true,
				val: () => lobby
			});
			(update as Mock).mockResolvedValue(undefined);

			await reconnect();

			// updatePlayerStatus should be called
			expect(update).toHaveBeenCalled();
		});

		it('should handle Firebase errors gracefully', async () => {
			saveSession({
				playerId: 'p1',
				lobbyCode: '123456',
				playerName: 'Host'
			});

			(get as Mock).mockRejectedValue(new Error('Network error'));

			const result = await reconnect();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Kon niet opnieuw verbinden');
			expect(getSession()).toBe(null);
		});
	});

	describe('subscribeLobby', () => {
		it('should call onValue with lobby reference', () => {
			const callback = vi.fn();

			subscribeLobby('123456', callback);

			expect(onValue).toHaveBeenCalled();
		});

		it('should return unsubscribe function', () => {
			const mockUnsubscribe = vi.fn();
			(onValue as Mock).mockReturnValue(mockUnsubscribe);

			const unsubscribe = subscribeLobby('123456', vi.fn());

			expect(unsubscribe).toBe(mockUnsubscribe);
		});

		it('should call callback with lobby when snapshot exists', () => {
			const callback = vi.fn();
			const lobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });

			(onValue as Mock).mockImplementation((_ref, cb) => {
				cb({
					exists: () => true,
					val: () => lobby
				});
				return vi.fn();
			});

			subscribeLobby('123456', callback);

			expect(callback).toHaveBeenCalledWith(lobby);
		});

		it('should call callback with null when snapshot does not exist', () => {
			const callback = vi.fn();

			(onValue as Mock).mockImplementation((_ref, cb) => {
				cb({
					exists: () => false
				});
				return vi.fn();
			});

			subscribeLobby('123456', callback);

			expect(callback).toHaveBeenCalledWith(null);
		});
	});

	describe('updatePlayerStatus', () => {
		it('should update player with connected status and serverTimestamp', async () => {
			// Mock get() to indicate player exists
			(get as Mock).mockResolvedValue({
				exists: () => true
			});
			(update as Mock).mockResolvedValue(undefined);

			await updatePlayerStatus('123456', 'p1', true);

			expect(update).toHaveBeenCalledWith('mockRef', {
				connected: true,
				lastSeen: 'SERVER_TIMESTAMP'
			});
		});

		it('should set connected to false when disconnecting', async () => {
			// Mock get() to indicate player exists
			(get as Mock).mockResolvedValue({
				exists: () => true
			});
			(update as Mock).mockResolvedValue(undefined);

			await updatePlayerStatus('123456', 'p1', false);

			expect(update).toHaveBeenCalledWith('mockRef', {
				connected: false,
				lastSeen: 'SERVER_TIMESTAMP'
			});
		});

		it('should not update when player does not exist', async () => {
			// Mock get() to indicate player does not exist
			(get as Mock).mockResolvedValue({
				exists: () => false
			});

			await updatePlayerStatus('123456', 'nonexistent', true);

			// update should NOT be called when player doesn't exist
			expect(update).not.toHaveBeenCalled();
		});

		it('should not throw on Firebase error', async () => {
			(get as Mock).mockRejectedValue(new Error('Firebase error'));

			// Should not throw
			await expect(updatePlayerStatus('123456', 'p1', true)).resolves.not.toThrow();
		});
	});
});
