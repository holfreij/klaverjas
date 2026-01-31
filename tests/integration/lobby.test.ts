import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { ref, get, remove } from 'firebase/database';
import { getFirebaseDatabase } from '$lib/multiplayer/firebase';
import {
	createLobby,
	joinLobby,
	leaveLobby,
	changeSeat,
	startGame,
	clearSession
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
	} catch (error) {
		// Ignore errors during cleanup
	}
}

describe('Firebase Lobby Integration Tests', () => {
	beforeAll(() => {
		// Clear any existing session
		clearSession();
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
});
