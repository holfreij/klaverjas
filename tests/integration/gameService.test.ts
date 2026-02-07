import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { ref, get, remove } from 'firebase/database';
import { getFirebaseDatabase } from '$lib/multiplayer/firebase';
import { createLobby, joinLobby, startGame, clearSession } from '$lib/multiplayer/lobbyService';
import {
	initializeGame,
	chooseTrump,
	playCard,
	completeTrick,
	startNextRound
} from '$lib/multiplayer/gameService';
import type { Lobby, PlayerSeat } from '$lib/multiplayer/types';
import type { Card } from '$lib/game/deck';
import { getLegalMoves } from '$lib/game/rules';

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

async function getLobby(code: string): Promise<Lobby> {
	const db = getFirebaseDatabase();
	const lobbyRef = ref(db, `lobbies/${code}`);
	const snapshot = await get(lobbyRef);
	return snapshot.val() as Lobby;
}

async function createFullLobby(): Promise<{ code: string; hostId: string; playerIds: string[] }> {
	const createResult = await createLobby('Host');
	const code = createResult.lobbyCode!;
	const hostId = createResult.playerId!;
	createdLobbies.push(code);

	const playerIds = [hostId];
	for (let i = 2; i <= 4; i++) {
		clearSession();
		const joinResult = await joinLobby(code, `Player${i}`);
		playerIds.push(joinResult.playerId!);
	}

	return { code, hostId, playerIds };
}

describe('Firebase Game Service Integration Tests', () => {
	beforeAll(async () => {
		clearSession();
	});

	afterEach(async () => {
		for (const code of createdLobbies) {
			await cleanupLobby(code);
		}
		createdLobbies.length = 0;
		localStorageMock.clear();
	});

	describe('initializeGame', () => {
		it('should create initial game state in Firebase', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);

			const lobby = await getLobby(code);
			expect(lobby.game).not.toBeNull();
			expect(lobby.game!.phase).toBe('trump');
			expect(lobby.game!.round).toBe(1);
			expect(lobby.game!.trick).toBe(1);
		});

		it('should deal 8 cards to each player', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);

			const lobby = await getLobby(code);
			const game = lobby.game!;

			for (const seat of [0, 1, 2, 3] as PlayerSeat[]) {
				expect(game.hands[seat]).toHaveLength(8);
			}
		});

		it('should set dealer to seat 0 and trump chooser to seat 1', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);

			const lobby = await getLobby(code);
			const game = lobby.game!;

			expect(game.dealer).toBe(0);
			expect(game.trumpChooser).toBe(1);
			expect(game.currentPlayer).toBe(1);
		});

		it('should have no trump in initial state', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);

			const lobby = await getLobby(code);
			expect(lobby.game!.trump).toBeFalsy();
		});
	});

	describe('chooseTrump', () => {
		it('should set trump suit and change phase to playing', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);

			await chooseTrump(code, 1, '♥');

			const lobby = await getLobby(code);
			expect(lobby.game!.trump).toBe('♥');
			expect(lobby.game!.phase).toBe('playing');
			expect(lobby.game!.playingTeam).toBe('we');
		});

		it('should reject if phase is not trump', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			// Try to choose again when phase is 'playing'
			await expect(chooseTrump(code, 1, '♠')).rejects.toThrow();
		});

		it('should reject if wrong seat tries to choose', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);

			// Seat 0 tries to choose, but seat 1 is the trump chooser
			await expect(chooseTrump(code, 0, '♥')).rejects.toThrow();
		});
	});

	describe('playCard', () => {
		it('should add card to current trick', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			const lobby = await getLobby(code);
			const cardToPlay = lobby.game!.hands[1][0];

			await playCard(code, 1, cardToPlay);

			const updatedLobby = await getLobby(code);
			expect(updatedLobby.game!.currentTrick).toHaveLength(1);
			expect(updatedLobby.game!.currentTrick[0].seat).toBe(1);
		});

		it('should advance to next player', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			const lobby = await getLobby(code);
			const cardToPlay = lobby.game!.hands[1][0];

			await playCard(code, 1, cardToPlay);

			const updatedLobby = await getLobby(code);
			expect(updatedLobby.game!.currentPlayer).toBe(2);
		});

		it('should remove card from player hand', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			const lobby = await getLobby(code);
			const cardToPlay = lobby.game!.hands[1][0];

			await playCard(code, 1, cardToPlay);

			const updatedLobby = await getLobby(code);
			expect(updatedLobby.game!.hands[1]).toHaveLength(7);
		});

		it('should reject if phase is not playing', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);

			// Phase is 'trump', not 'playing'
			const lobby = await getLobby(code);
			const cardToPlay = lobby.game!.hands[1][0];

			await expect(playCard(code, 1, cardToPlay)).rejects.toThrow();
		});

		it('should reject if wrong player tries to play', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			// Seat 0 tries to play, but seat 1 is current player
			const lobby = await getLobby(code);
			const cardToPlay = lobby.game!.hands[0][0];

			await expect(playCard(code, 0, cardToPlay)).rejects.toThrow();
		});
	});

	describe('completeTrick', () => {
		async function playFullTrick(code: string): Promise<void> {
			// Play 4 cards - each player plays a legal card
			for (let i = 0; i < 4; i++) {
				const lobby = await getLobby(code);
				const game = lobby.game!;
				const seat = game.currentPlayer;
				const hand = game.hands[seat] ?? [];
				const trickCards = (game.currentTrick ?? []).map((c: { card: Card }) => c.card);

				// Find a legal move
				const legalMoves = getLegalMoves(hand, trickCards, game.trump!);
				const cardToPlay = legalMoves[0];

				await playCard(code, seat, cardToPlay);
			}
		}

		it('should complete trick and update scores', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullTrick(code);

			// Before completing, should have 4 cards in trick
			let lobby = await getLobby(code);
			expect(lobby.game!.currentTrick).toHaveLength(4);

			await completeTrick(code);

			lobby = await getLobby(code);
			// Firebase drops empty arrays, so currentTrick may be undefined
			expect(lobby.game!.currentTrick ?? []).toHaveLength(0);
			expect(lobby.game!.completedTricks).toHaveLength(1);
			expect(lobby.game!.trick).toBe(2);
		});

		it('should be idempotent (no-op if trick already completed)', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullTrick(code);
			await completeTrick(code);

			// Call again — should not throw or change state
			await completeTrick(code);

			const lobby = await getLobby(code);
			expect(lobby.game!.completedTricks).toHaveLength(1);
		});

		it('should set phase to roundEnd after 8 tricks', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			// Play all 8 tricks
			for (let trick = 0; trick < 8; trick++) {
				await playFullTrick(code);
				await completeTrick(code);
			}

			const lobby = await getLobby(code);
			expect(lobby.game!.phase).toBe('roundEnd');
		}, 30000);
	});

	describe('startNextRound', () => {
		async function playFullRound(code: string): Promise<void> {
			for (let trick = 0; trick < 8; trick++) {
				// Play 4 cards
				for (let i = 0; i < 4; i++) {
					const lobby = await getLobby(code);
					const game = lobby.game!;
					const seat = game.currentPlayer;
					const hand = game.hands[seat] ?? [];
					const trickCards = (game.currentTrick ?? []).map((c: { card: Card }) => c.card);

					const legalMoves = getLegalMoves(hand, trickCards, game.trump!);
					await playCard(code, seat, legalMoves[0]);
				}
				await completeTrick(code);
			}
		}

		it('should start a new round after roundEnd', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullRound(code);

			let lobby = await getLobby(code);
			expect(lobby.game!.phase).toBe('roundEnd');

			await startNextRound(code);

			lobby = await getLobby(code);
			expect(lobby.game!.phase).toBe('trump');
			expect(lobby.game!.round).toBe(2);
			expect(lobby.game!.dealer).toBe(1); // Rotated from 0 to 1

			// New hands should be dealt
			for (const seat of [0, 1, 2, 3] as PlayerSeat[]) {
				expect(lobby.game!.hands[seat]).toHaveLength(8);
			}
		}, 30000);

		it('should be idempotent (no-op if phase is not roundEnd)', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);

			// Phase is 'trump', not 'roundEnd'
			await startNextRound(code);

			const lobby = await getLobby(code);
			expect(lobby.game!.phase).toBe('trump');
			expect(lobby.game!.round).toBe(1);
		});
	});
});
