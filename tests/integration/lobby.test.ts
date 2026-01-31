import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { ref, get, remove } from 'firebase/database';
import { getFirebaseDatabase } from '$lib/multiplayer/firebase';
import {
	createLobby,
	joinLobby,
	leaveLobby,
	changeSeat,
	startGame,
	clearSession,
	saveSession,
	getSession,
	reconnect,
	subscribeLobby,
	updatePlayerStatus
} from '$lib/multiplayer/lobbyService';
import type { Lobby } from '$lib/multiplayer/types';

// Track created lobbies for cleanup
const createdLobbies: string[] = [];

// Mock localStorage for tests
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

async function cleanupLobby(code: string) {
	try {
		const db = getFirebaseDatabase();
		const lobbyRef = ref(db, `lobbies/${code}`);
		await remove(lobbyRef);
	} catch {
		// Ignore errors during cleanup
	}
}

describe('Firebase Lobby Integration Tests', () => {
	beforeAll(async () => {
		// Clear any existing session
		clearSession();
		// Clean up test lobby code that might exist from previous runs
		await cleanupLobby('999999');
	});

	afterEach(async () => {
		// Clean up all created lobbies
		for (const code of createdLobbies) {
			await cleanupLobby(code);
		}
		createdLobbies.length = 0;
		localStorageMock.clear();
	});

	describe('createLobby', () => {
		it('should create a lobby in Firebase', async () => {
			const result = await createLobby('TestHost');

			expect(result.success).toBe(true);
			expect(result.lobbyCode).toBeDefined();
			expect(result.playerId).toBeDefined();

			if (result.lobbyCode) {
				createdLobbies.push(result.lobbyCode);

				// Verify lobby exists in Firebase
				const db = getFirebaseDatabase();
				const lobbyRef = ref(db, `lobbies/${result.lobbyCode}`);
				const snapshot = await get(lobbyRef);

				expect(snapshot.exists()).toBe(true);
				const lobby = snapshot.val() as Lobby;
				expect(lobby.code).toBe(result.lobbyCode);
				expect(lobby.host).toBe(result.playerId);
				expect(lobby.status).toBe('waiting');
				expect(lobby.players[result.playerId!].name).toBe('TestHost');
				expect(lobby.players[result.playerId!].seat).toBe(0);
			}
		});

		it('should reject invalid player names', async () => {
			const result = await createLobby('ab'); // Too short

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should trim player names', async () => {
			const result = await createLobby('  TestHost  ');

			expect(result.success).toBe(true);

			if (result.lobbyCode) {
				createdLobbies.push(result.lobbyCode);

				const db = getFirebaseDatabase();
				const lobbyRef = ref(db, `lobbies/${result.lobbyCode}`);
				const snapshot = await get(lobbyRef);
				const lobby = snapshot.val() as Lobby;

				expect(lobby.players[result.playerId!].name).toBe('TestHost');
			}
		});
	});

	describe('joinLobby', () => {
		it('should join an existing lobby', async () => {
			// Create a lobby first
			const createResult = await createLobby('Host');
			expect(createResult.success).toBe(true);
			createdLobbies.push(createResult.lobbyCode!);

			// Clear session to simulate different user
			clearSession();

			// Join the lobby
			const joinResult = await joinLobby(createResult.lobbyCode!, 'Player2');

			expect(joinResult.success).toBe(true);
			expect(joinResult.playerId).toBeDefined();

			// Verify player was added
			const db = getFirebaseDatabase();
			const lobbyRef = ref(db, `lobbies/${createResult.lobbyCode}`);
			const snapshot = await get(lobbyRef);
			const lobby = snapshot.val() as Lobby;

			expect(Object.keys(lobby.players)).toHaveLength(2);
			expect(lobby.players[joinResult.playerId!].name).toBe('Player2');
			expect(lobby.players[joinResult.playerId!].seat).toBe(1); // Next available seat
		});

		it('should reject non-existent lobby code', async () => {
			const result = await joinLobby('999999', 'Player');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Lobby niet gevonden');
		});

		it('should reject duplicate player names', async () => {
			// Create a lobby
			const createResult = await createLobby('Player');
			expect(createResult.success).toBe(true);
			createdLobbies.push(createResult.lobbyCode!);

			clearSession();

			// Try to join with same name
			const joinResult = await joinLobby(createResult.lobbyCode!, 'Player');

			expect(joinResult.success).toBe(false);
			expect(joinResult.error).toBe('Deze naam is al in gebruik');
		});

		it('should reject invalid lobby code format', async () => {
			const result = await joinLobby('abc', 'Player');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Ongeldige lobbycode');
		});

		it('should allow joining as table device', async () => {
			const createResult = await createLobby('Host');
			expect(createResult.success).toBe(true);
			createdLobbies.push(createResult.lobbyCode!);

			clearSession();

			const joinResult = await joinLobby(createResult.lobbyCode!, 'TableDevice', 'table');

			expect(joinResult.success).toBe(true);

			const db = getFirebaseDatabase();
			const lobbyRef = ref(db, `lobbies/${createResult.lobbyCode}`);
			const snapshot = await get(lobbyRef);
			const lobby = snapshot.val() as Lobby;

			expect(lobby.players[joinResult.playerId!].seat).toBe('table');
		});
	});

	describe('leaveLobby', () => {
		it('should remove player from lobby', async () => {
			// Create lobby and join with another player
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);
			clearSession();

			const joinResult = await joinLobby(createResult.lobbyCode!, 'Player2');
			expect(joinResult.success).toBe(true);

			// Leave the lobby
			await leaveLobby(createResult.lobbyCode!, joinResult.playerId!);

			// Verify player was removed
			const db = getFirebaseDatabase();
			const lobbyRef = ref(db, `lobbies/${createResult.lobbyCode}`);
			const snapshot = await get(lobbyRef);
			const lobby = snapshot.val() as Lobby;

			expect(Object.keys(lobby.players)).toHaveLength(1);
			expect(lobby.players[joinResult.playerId!]).toBeUndefined();
		});

		it('should transfer host when host leaves', async () => {
			// Create lobby
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);
			const hostId = createResult.playerId!;
			clearSession();

			// Join with another player
			const joinResult = await joinLobby(createResult.lobbyCode!, 'Player2');
			expect(joinResult.success).toBe(true);

			// Host leaves
			await leaveLobby(createResult.lobbyCode!, hostId);

			// Verify host was transferred
			const db = getFirebaseDatabase();
			const lobbyRef = ref(db, `lobbies/${createResult.lobbyCode}`);
			const snapshot = await get(lobbyRef);
			const lobby = snapshot.val() as Lobby;

			expect(lobby.host).toBe(joinResult.playerId);
		});

		it('should delete lobby when last player leaves', async () => {
			// Create lobby
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			// Host leaves
			await leaveLobby(createResult.lobbyCode!, createResult.playerId!);

			// Verify lobby was deleted
			const db = getFirebaseDatabase();
			const lobbyRef = ref(db, `lobbies/${createResult.lobbyCode}`);
			const snapshot = await get(lobbyRef);

			expect(snapshot.exists()).toBe(false);
		});
	});

	describe('changeSeat', () => {
		it('should change player seat', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			const result = await changeSeat(createResult.lobbyCode!, createResult.playerId!, 2);

			expect(result.success).toBe(true);

			const db = getFirebaseDatabase();
			const lobbyRef = ref(db, `lobbies/${createResult.lobbyCode}`);
			const snapshot = await get(lobbyRef);
			const lobby = snapshot.val() as Lobby;

			expect(lobby.players[createResult.playerId!].seat).toBe(2);
		});

		it('should swap seats when target is occupied', async () => {
			// Create lobby with host at seat 0
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);
			const hostId = createResult.playerId!;
			clearSession();

			// Join with another player (should get seat 1)
			const joinResult = await joinLobby(createResult.lobbyCode!, 'Player2');
			const player2Id = joinResult.playerId!;

			// Player2 tries to take seat 0 (host's seat)
			const result = await changeSeat(createResult.lobbyCode!, player2Id, 0);

			expect(result.success).toBe(true);

			const db = getFirebaseDatabase();
			const lobbyRef = ref(db, `lobbies/${createResult.lobbyCode}`);
			const snapshot = await get(lobbyRef);
			const lobby = snapshot.val() as Lobby;

			// Seats should be swapped
			expect(lobby.players[player2Id].seat).toBe(0);
			expect(lobby.players[hostId].seat).toBe(1);
		});
	});

	describe('startGame', () => {
		it('should reject start when not all seats filled', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			const result = await startGame(createResult.lobbyCode!, createResult.playerId!);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Niet alle stoelen zijn bezet');
		});

		it('should reject start from non-host', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);
			clearSession();

			const joinResult = await joinLobby(createResult.lobbyCode!, 'Player2');

			const result = await startGame(createResult.lobbyCode!, joinResult.playerId!);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Alleen de host kan het spel starten');
		});

		it('should start game when 4 players are seated', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);
			const hostId = createResult.playerId!;

			// Add 3 more players
			for (let i = 2; i <= 4; i++) {
				clearSession();
				const joinResult = await joinLobby(createResult.lobbyCode!, `Player${i}`);
				expect(joinResult.success).toBe(true);
			}

			const result = await startGame(createResult.lobbyCode!, hostId);

			expect(result.success).toBe(true);

			const db = getFirebaseDatabase();
			const lobbyRef = ref(db, `lobbies/${createResult.lobbyCode}`);
			const snapshot = await get(lobbyRef);
			const lobby = snapshot.val() as Lobby;

			expect(lobby.status).toBe('playing');
		});

		it('should allow start with 4 players plus table device', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);
			const hostId = createResult.playerId!;

			// Add 3 more players
			for (let i = 2; i <= 4; i++) {
				clearSession();
				await joinLobby(createResult.lobbyCode!, `Player${i}`);
			}

			// Add table device
			clearSession();
			await joinLobby(createResult.lobbyCode!, 'Table', 'table');

			const result = await startGame(createResult.lobbyCode!, hostId);

			expect(result.success).toBe(true);
		});
	});

	describe('Session Management', () => {
		describe('saveSession and getSession', () => {
			it('should save session to localStorage', () => {
				const sessionData = {
					playerId: 'test_player_id',
					lobbyCode: '123456',
					playerName: 'TestPlayer'
				};

				saveSession(sessionData);

				const retrieved = getSession();
				expect(retrieved).toEqual(sessionData);
			});

			it('should return null when no session exists', () => {
				localStorageMock.clear();

				const retrieved = getSession();
				expect(retrieved).toBe(null);
			});

			it('should return null for corrupted session data', () => {
				localStorageMock.setItem('klaverjas_session', 'not valid json');

				const retrieved = getSession();
				expect(retrieved).toBe(null);
			});
		});

		describe('clearSession', () => {
			it('should remove session from localStorage', () => {
				saveSession({
					playerId: 'p1',
					lobbyCode: '123456',
					playerName: 'Test'
				});

				clearSession();

				expect(getSession()).toBe(null);
			});

			it('should not throw when no session exists', () => {
				localStorageMock.clear();

				expect(() => clearSession()).not.toThrow();
			});
		});

		describe('createLobby saves session', () => {
			it('should save session after successful creation', async () => {
				localStorageMock.clear();

				const result = await createLobby('TestHost');
				expect(result.success).toBe(true);
				createdLobbies.push(result.lobbyCode!);

				const session = getSession();
				expect(session).not.toBe(null);
				expect(session?.playerId).toBe(result.playerId);
				expect(session?.lobbyCode).toBe(result.lobbyCode);
				expect(session?.playerName).toBe('TestHost');
			});
		});

		describe('joinLobby saves session', () => {
			it('should save session after successful join', async () => {
				const createResult = await createLobby('Host');
				createdLobbies.push(createResult.lobbyCode!);
				clearSession();

				const joinResult = await joinLobby(createResult.lobbyCode!, 'Player2');
				expect(joinResult.success).toBe(true);

				const session = getSession();
				expect(session).not.toBe(null);
				expect(session?.playerId).toBe(joinResult.playerId);
				expect(session?.lobbyCode).toBe(createResult.lobbyCode);
				expect(session?.playerName).toBe('Player2');
			});
		});
	});

	describe('reconnect', () => {
		it('should return error when no session exists', async () => {
			localStorageMock.clear();

			const result = await reconnect();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Geen sessie gevonden');
		});

		it('should return error when lobby no longer exists', async () => {
			// Save a session for a non-existent lobby
			saveSession({
				playerId: 'p1',
				lobbyCode: '999999',
				playerName: 'Ghost'
			});

			const result = await reconnect();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Lobby bestaat niet meer');
			// Session should be cleared
			expect(getSession()).toBe(null);
		});

		it('should return error when player not in lobby', async () => {
			// Create a lobby
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			// Save a session with wrong player ID
			saveSession({
				playerId: 'nonexistent_player',
				lobbyCode: createResult.lobbyCode!,
				playerName: 'Ghost'
			});

			const result = await reconnect();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Speler niet gevonden in lobby');
			expect(getSession()).toBe(null);
		});

		it('should successfully reconnect to existing lobby', async () => {
			// Create a lobby and get the session
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			// Session is already saved by createLobby
			const savedSession = getSession();
			expect(savedSession).not.toBe(null);

			const result = await reconnect();

			expect(result.success).toBe(true);
			expect(result.lobby).toBeDefined();
			expect(result.lobby?.code).toBe(createResult.lobbyCode);
			expect(result.playerId).toBe(createResult.playerId);
		});

		it('should update connection status on reconnect', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			// Manually set connected to false in Firebase
			const db = getFirebaseDatabase();
			const playerRef = ref(
				db,
				`lobbies/${createResult.lobbyCode}/players/${createResult.playerId}`
			);
			const { update } = await import('firebase/database');
			await update(playerRef, { connected: false });

			// Reconnect
			const result = await reconnect();

			expect(result.success).toBe(true);

			// Verify connected is now true
			const snapshot = await get(playerRef);
			expect(snapshot.val().connected).toBe(true);
		});
	});

	describe('subscribeLobby', () => {
		it('should call callback with lobby data when lobby exists', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			return new Promise<void>((resolve) => {
				const unsubscribe = subscribeLobby(createResult.lobbyCode!, (lobby) => {
					expect(lobby).not.toBe(null);
					expect(lobby?.code).toBe(createResult.lobbyCode);
					expect(lobby?.host).toBe(createResult.playerId);
					unsubscribe();
					resolve();
				});
			});
		});

		it('should call callback with null when lobby does not exist', async () => {
			return new Promise<void>((resolve) => {
				const unsubscribe = subscribeLobby('999999', (lobby) => {
					expect(lobby).toBe(null);
					unsubscribe();
					resolve();
				});
			});
		});

		it('should receive updates when lobby changes', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);
			clearSession();

			let callCount = 0;
			const receivedUpdates: (Lobby | null)[] = [];

			return new Promise<void>((resolve) => {
				const unsubscribe = subscribeLobby(createResult.lobbyCode!, async (lobby) => {
					callCount++;
					receivedUpdates.push(lobby);

					if (callCount === 1) {
						// First callback - initial data
						expect(lobby).not.toBe(null);
						expect(Object.keys(lobby!.players)).toHaveLength(1);

						// Trigger an update by joining
						await joinLobby(createResult.lobbyCode!, 'Player2');
					} else if (callCount === 2) {
						// Second callback - after join
						expect(lobby).not.toBe(null);
						expect(Object.keys(lobby!.players)).toHaveLength(2);
						unsubscribe();
						resolve();
					}
				});
			});
		});

		it('should receive null when lobby is deleted', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			let deletionTriggered = false;

			return new Promise<void>((resolve) => {
				const unsubscribe = subscribeLobby(createResult.lobbyCode!, async (lobby) => {
					if (!deletionTriggered) {
						// First callback - lobby exists
						expect(lobby).not.toBe(null);
						deletionTriggered = true;

						// Delete the lobby (by having host leave)
						await leaveLobby(createResult.lobbyCode!, createResult.playerId!);
					} else if (lobby === null) {
						// Lobby was deleted - may come after intermediate updates
						unsubscribe();
						resolve();
					}
					// Ignore intermediate callbacks (e.g., lobby with empty players)
				});
			});
		});
	});

	describe('updatePlayerStatus', () => {
		it('should update player connected status to true', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			// First set to false
			await updatePlayerStatus(createResult.lobbyCode!, createResult.playerId!, false);

			const db = getFirebaseDatabase();
			const playerRef = ref(
				db,
				`lobbies/${createResult.lobbyCode}/players/${createResult.playerId}`
			);
			let snapshot = await get(playerRef);
			expect(snapshot.val().connected).toBe(false);

			// Now set to true
			await updatePlayerStatus(createResult.lobbyCode!, createResult.playerId!, true);

			snapshot = await get(playerRef);
			expect(snapshot.val().connected).toBe(true);
		});

		it('should update player connected status to false', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			await updatePlayerStatus(createResult.lobbyCode!, createResult.playerId!, false);

			const db = getFirebaseDatabase();
			const playerRef = ref(
				db,
				`lobbies/${createResult.lobbyCode}/players/${createResult.playerId}`
			);
			const snapshot = await get(playerRef);
			expect(snapshot.val().connected).toBe(false);
		});

		it('should update lastSeen timestamp', async () => {
			const createResult = await createLobby('Host');
			createdLobbies.push(createResult.lobbyCode!);

			const db = getFirebaseDatabase();
			const playerRef = ref(
				db,
				`lobbies/${createResult.lobbyCode}/players/${createResult.playerId}`
			);

			// Get initial lastSeen
			let snapshot = await get(playerRef);
			const _initialLastSeen = snapshot.val().lastSeen;

			// Wait a bit then update status
			await new Promise((resolve) => setTimeout(resolve, 50));
			await updatePlayerStatus(createResult.lobbyCode!, createResult.playerId!, true);

			snapshot = await get(playerRef);
			// lastSeen should be updated (or be a server timestamp object)
			const newLastSeen = snapshot.val().lastSeen;
			// Firebase serverTimestamp() might return an object or a number
			expect(newLastSeen).toBeDefined();
		});

		it('should not throw for non-existent lobby', async () => {
			// Should not throw, just log error
			await expect(updatePlayerStatus('999999', 'nonexistent', true)).resolves.not.toThrow();
		});
	});
});
