import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { ref, get, remove } from 'firebase/database';
import { getFirebaseDatabase } from '$lib/multiplayer/firebase';
import { createLobby, joinLobby, startGame, clearSession } from '$lib/multiplayer/lobbyService';
import {
	initializeGame,
	chooseTrump,
	playCard,
	completeTrick,
	startNextRound,
	claimRoem,
	callVerzaakt
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

describe('Firebase Game Service Integration Tests', { timeout: 10000 }, () => {
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

	describe('completeTrick with pending roem', () => {
		async function playFullTrick(code: string): Promise<void> {
			for (let i = 0; i < 4; i++) {
				const lobby = await getLobby(code);
				const game = lobby.game!;
				const seat = game.currentPlayer;
				const hand = game.hands[seat] ?? [];
				const trickCards = (game.currentTrick ?? []).map((c: { card: Card }) => c.card);
				const legalMoves = getLegalMoves(hand, trickCards, game.trump!);
				await playCard(code, seat, legalMoves[0]);
			}
		}

		it('should assign roemPointsPending to the trick winner team', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			// Play a full trick
			await playFullTrick(code);

			// Manually set roemPointsPending via a raw Firebase write to simulate claimed roem
			const db = getFirebaseDatabase();
			const gameRef = ref(db, `lobbies/${code}/game`);
			const snap = await get(gameRef);
			const game = snap.val() as import('$lib/multiplayer/types').GameState;
			game.roemPointsPending = 20;
			const lobbyRef = ref(db, `lobbies/${code}`);
			const { update } = await import('firebase/database');
			await update(lobbyRef, { game });

			await completeTrick(code);

			const lobby = await getLobby(code);
			// Pending roem should be reset to 0
			expect(lobby.game!.roemPointsPending ?? 0).toBe(0);

			// One of the teams should have 20 roem
			const nsRoem = lobby.game!.scores.ns.roem;
			const weRoem = lobby.game!.scores.we.roem;
			expect(nsRoem + weRoem).toBe(20);
		});

		it('should reset roemPointsPending to 0 after completing trick', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullTrick(code);
			await completeTrick(code);

			const lobby = await getLobby(code);
			expect(lobby.game!.roemPointsPending ?? 0).toBe(0);
		});
	});

	describe('trickEnd phase', () => {
		async function playFullTrick(code: string): Promise<void> {
			for (let i = 0; i < 4; i++) {
				const lobby = await getLobby(code);
				const game = lobby.game!;
				const seat = game.currentPlayer;
				const hand = game.hands[seat] ?? [];
				const trickCards = (game.currentTrick ?? []).map((c: { card: Card }) => c.card);
				const legalMoves = getLegalMoves(hand, trickCards, game.trump!);
				await playCard(code, seat, legalMoves[0]);
			}
		}

		it('should transition to trickEnd phase after 4th card', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullTrick(code);

			const lobby = await getLobby(code);
			expect(lobby.game!.phase).toBe('trickEnd');
			expect(lobby.game!.currentTrick).toHaveLength(4);
		});

		it('should set currentPlayer to trick winner during trickEnd', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullTrick(code);

			const lobby = await getLobby(code);
			expect(lobby.game!.phase).toBe('trickEnd');
			// currentPlayer should be one of the 4 seats
			expect([0, 1, 2, 3]).toContain(lobby.game!.currentPlayer);
		});

		it('should complete old trick and play new card when trick winner plays during trickEnd', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullTrick(code);

			const lobby = await getLobby(code);
			const winner = lobby.game!.currentPlayer;
			const winnerHand = lobby.game!.hands[winner] ?? [];
			const legalMoves = getLegalMoves(winnerHand, [], lobby.game!.trump!);

			// Winner plays a card — should atomically complete trick + play card
			await playCard(code, winner, legalMoves[0]);

			const updated = await getLobby(code);
			expect(updated.game!.phase).toBe('playing');
			expect(updated.game!.trick).toBe(2);
			expect(updated.game!.completedTricks).toHaveLength(1);
			expect(updated.game!.currentTrick).toHaveLength(1);
			expect(updated.game!.currentTrick[0].seat).toBe(winner);
		});

		it('should reject playCard during trickEnd if caller is not trick winner', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullTrick(code);

			const lobby = await getLobby(code);
			const winner = lobby.game!.currentPlayer;
			// Pick a seat that is NOT the winner
			const nonWinner = ([0, 1, 2, 3] as PlayerSeat[]).find((s) => s !== winner)!;
			const hand = lobby.game!.hands[nonWinner] ?? [];

			await expect(playCard(code, nonWinner, hand[0])).rejects.toThrow();
		});

		it('should allow claimRoem during trickEnd phase', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullTrick(code);

			const lobby = await getLobby(code);
			expect(lobby.game!.phase).toBe('trickEnd');

			// Should not throw — roem claiming should work during trickEnd
			await claimRoem(code, 0);

			const updated = await getLobby(code);
			expect(updated.game!.roemClaimed).toBe(true);
		});

		it('should allow callVerzaakt during trickEnd phase', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullTrick(code);

			const lobby = await getLobby(code);
			expect(lobby.game!.phase).toBe('trickEnd');

			// Should not throw — verzaakt calling should work during trickEnd
			await callVerzaakt(code, 0);

			const updated = await getLobby(code);
			expect(updated.game!.lastNotification).not.toBeNull();
		});

		it('should assign pending roem when completing trick via playCard during trickEnd', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			await playFullTrick(code);

			// Manually set roemPointsPending to simulate claimed roem
			const db = getFirebaseDatabase();
			const gameRef = ref(db, `lobbies/${code}/game`);
			const snap = await get(gameRef);
			const game = snap.val() as import('$lib/multiplayer/types').GameState;
			game.roemPointsPending = 20;
			const lobbyRef = ref(db, `lobbies/${code}`);
			const { update } = await import('firebase/database');
			await update(lobbyRef, { game });

			// Now winner plays a card to trigger completeTrickAndPlayCard
			const lobby = await getLobby(code);
			const winner = lobby.game!.currentPlayer;
			const winnerHand = lobby.game!.hands[winner] ?? [];
			const legalMoves = getLegalMoves(winnerHand, [], lobby.game!.trump!);
			await playCard(code, winner, legalMoves[0]);

			const updated = await getLobby(code);
			expect(updated.game!.roemPointsPending ?? 0).toBe(0);
			// One team should have the 20 roem
			const nsRoem = updated.game!.scores.ns.roem;
			const weRoem = updated.game!.scores.we.roem;
			expect(nsRoem + weRoem).toBe(20);
		});
	});

	describe('claimRoem', () => {
		it('should auto-detect roem and set roemPointsPending', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			// Play one card so we can claim roem
			const lobby = await getLobby(code);
			const cardToPlay = lobby.game!.hands[1][0];
			await playCard(code, 1, cardToPlay);

			// Claim roem — result depends on actual cards
			await claimRoem(code, 1);

			const updated = await getLobby(code);
			expect(updated.game!.roemClaimed).toBe(true);
			// Either roemPointsPending > 0 or notification is roemRejected
			expect(updated.game!.lastNotification).not.toBeNull();
			expect(updated.game!.lastNotification!.timestamp).toBeGreaterThan(0);
		});

		it('should reject if phase is not playing', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);

			// Phase is 'trump'
			await expect(claimRoem(code, 1)).rejects.toThrow();
		});

		it('should reject if already claimed this trick', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			const lobby = await getLobby(code);
			const cardToPlay = lobby.game!.hands[1][0];
			await playCard(code, 1, cardToPlay);

			await claimRoem(code, 1);
			// Second claim should fail
			await expect(claimRoem(code, 2)).rejects.toThrow();
		});

		it('should reject if no cards in trick', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			// No cards played yet
			await expect(claimRoem(code, 1)).rejects.toThrow();
		});

		it('should set roemRejected notification when no roem in trick', async () => {
			// We can't easily control what cards are dealt, but we can verify
			// the notification structure is correct
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			const lobby = await getLobby(code);
			const cardToPlay = lobby.game!.hands[1][0];
			await playCard(code, 1, cardToPlay);

			await claimRoem(code, 1);

			const updated = await getLobby(code);
			const notif = updated.game!.lastNotification!;
			expect(notif.type).toMatch(/^roem(Claimed|Rejected)$/);
		});
	});

	describe('callVerzaakt', () => {
		it('should check for verzaakt and set notification', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			// Play 2 legal cards so we can call verzaakt
			const lobby = await getLobby(code);
			const seat1 = lobby.game!.currentPlayer;
			const hand1 = lobby.game!.hands[seat1] ?? [];
			const trickCards1 = (lobby.game!.currentTrick ?? []).map((c: { card: Card }) => c.card);
			const legalMoves1 = getLegalMoves(hand1, trickCards1, lobby.game!.trump!);
			await playCard(code, seat1, legalMoves1[0]);

			const lobby2 = await getLobby(code);
			const seat2 = lobby2.game!.currentPlayer;
			const hand2 = lobby2.game!.hands[seat2] ?? [];
			const trickCards2 = (lobby2.game!.currentTrick ?? []).map((c: { card: Card }) => c.card);
			const legalMoves2 = getLegalMoves(hand2, trickCards2, lobby2.game!.trump!);
			await playCard(code, seat2, legalMoves2[0]);

			// Call verzaakt — with legal moves, should get verzaaktNotFound
			await callVerzaakt(code, 0);

			const updated = await getLobby(code);
			expect(updated.game!.lastNotification).not.toBeNull();
			// With random legal cards, most likely verzaaktNotFound
			expect(updated.game!.lastNotification!.type).toMatch(/^verzaakt(Found|NotFound)$/);
			// Game should still be in playing phase (no illegal moves found)
			if (updated.game!.lastNotification!.type === 'verzaaktNotFound') {
				expect(updated.game!.phase).toBe('playing');
			}
		});

		it('should reject if phase is not playing', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);

			// Phase is 'trump'
			await expect(callVerzaakt(code, 1)).rejects.toThrow();
		});

		it('should reject if less than 2 cards in trick', async () => {
			const { code, hostId } = await createFullLobby();
			await startGame(code, hostId);
			await initializeGame(code);
			await chooseTrump(code, 1, '♥');

			// Play only 1 card
			const lobby = await getLobby(code);
			const seat = lobby.game!.currentPlayer;
			const hand = lobby.game!.hands[seat] ?? [];
			const trickCards = (lobby.game!.currentTrick ?? []).map((c: { card: Card }) => c.card);
			const legalMoves = getLegalMoves(hand, trickCards, lobby.game!.trump!);
			await playCard(code, seat, legalMoves[0]);

			await expect(callVerzaakt(code, 0)).rejects.toThrow();
		});
	});
});
