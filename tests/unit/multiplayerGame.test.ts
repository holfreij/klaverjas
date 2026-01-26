/**
 * Tests for multiplayer game helper utilities.
 */

import { describe, it, expect } from 'vitest';
import {
	isPlayerTurn,
	getHandForSeat,
	getLegalMovesForPlayer,
} from '$lib/multiplayer/game';
import type { MultiplayerGameState } from '$lib/multiplayer/types';
import type { Card } from '$lib/game/deck';

// Helper to create a minimal game state for testing
function createGameState(overrides: Partial<MultiplayerGameState> = {}): MultiplayerGameState {
	const defaultHands: Record<number, Card[]> = {
		0: [
			{ suit: 'Harten', rank: 'A' },
			{ suit: 'Harten', rank: 'K' },
			{ suit: 'Schoppen', rank: 'J' },
		],
		1: [
			{ suit: 'Ruiten', rank: 'A' },
			{ suit: 'Ruiten', rank: 'K' },
		],
		2: [
			{ suit: 'Klaver', rank: 'A' },
			{ suit: 'Klaver', rank: 'K' },
			{ suit: 'Klaver', rank: 'Q' },
			{ suit: 'Klaver', rank: 'J' },
		],
		3: [
			{ suit: 'Schoppen', rank: 'A' },
		],
	};

	return {
		phase: 'playing',
		round: 1,
		dealer: 0,
		trump: 'Schoppen',
		playingTeam: 'WE',
		currentPlayer: 0,
		hands: defaultHands,
		currentTrick: [],
		completedTricks: [],
		scores: { NS: 0, WE: 0 },
		roemClaims: [],
		...overrides,
	};
}

describe('isPlayerTurn', () => {
	it('should return true when it is the player\'s turn', () => {
		const game = createGameState({ currentPlayer: 2 });
		expect(isPlayerTurn(game, 2)).toBe(true);
	});

	it('should return false when it is not the player\'s turn', () => {
		const game = createGameState({ currentPlayer: 0 });
		expect(isPlayerTurn(game, 1)).toBe(false);
		expect(isPlayerTurn(game, 2)).toBe(false);
		expect(isPlayerTurn(game, 3)).toBe(false);
	});

	it('should return false when game is null', () => {
		expect(isPlayerTurn(null, 0)).toBe(false);
	});

	it('should return false when seat is null', () => {
		const game = createGameState({ currentPlayer: 0 });
		expect(isPlayerTurn(game, null)).toBe(false);
	});
});

describe('getHandForSeat', () => {
	it('should return the hand for a valid seat', () => {
		const game = createGameState();
		const hand = getHandForSeat(game, 0);
		expect(hand).toHaveLength(3);
		expect(hand).toContainEqual({ suit: 'Harten', rank: 'A' });
	});

	it('should return different hands for different seats', () => {
		const game = createGameState();
		const hand0 = getHandForSeat(game, 0);
		const hand1 = getHandForSeat(game, 1);
		const hand2 = getHandForSeat(game, 2);
		const hand3 = getHandForSeat(game, 3);

		expect(hand0).toHaveLength(3);
		expect(hand1).toHaveLength(2);
		expect(hand2).toHaveLength(4);
		expect(hand3).toHaveLength(1);
	});

	it('should return empty array when game is null', () => {
		expect(getHandForSeat(null, 0)).toEqual([]);
	});

	it('should return empty array for invalid seat', () => {
		const game = createGameState({ hands: { 0: [], 1: [], 2: [], 3: [] } });
		expect(getHandForSeat(game, 5)).toEqual([]);
	});
});

describe('getLegalMovesForPlayer', () => {
	it('should return empty array when game is null', () => {
		expect(getLegalMovesForPlayer(null, 0)).toEqual([]);
	});

	it('should return empty array when not in playing phase', () => {
		const game = createGameState({ phase: 'trump' });
		expect(getLegalMovesForPlayer(game, 0)).toEqual([]);
	});

	it('should return empty array when no trump is selected', () => {
		const game = createGameState({ trump: null });
		expect(getLegalMovesForPlayer(game, 0)).toEqual([]);
	});

	it('should return all cards when leading', () => {
		const game = createGameState({ currentTrick: [] });
		const legalMoves = getLegalMovesForPlayer(game, 0);
		expect(legalMoves).toHaveLength(3);
	});

	it('should return only cards of led suit when following', () => {
		const game = createGameState({
			currentTrick: [
				{ card: { suit: 'Harten', rank: 'Q' }, seat: 3 },
			],
		});
		// Player 0 has Harten A and K, and Schoppen J
		const legalMoves = getLegalMovesForPlayer(game, 0);
		expect(legalMoves).toHaveLength(2); // Must follow with Harten
		expect(legalMoves).toContainEqual({ suit: 'Harten', rank: 'A' });
		expect(legalMoves).toContainEqual({ suit: 'Harten', rank: 'K' });
	});

	it('should return trump when cannot follow suit', () => {
		const game = createGameState({
			currentTrick: [
				{ card: { suit: 'Ruiten', rank: 'Q' }, seat: 3 },
			],
		});
		// Player 0 has Harten A and K (no Ruiten), and Schoppen J (trump)
		const legalMoves = getLegalMovesForPlayer(game, 0);
		expect(legalMoves).toHaveLength(1); // Must trump with Schoppen J
		expect(legalMoves).toContainEqual({ suit: 'Schoppen', rank: 'J' });
	});

	it('should return all cards when cannot follow and has no trump', () => {
		const game = createGameState({
			hands: {
				0: [
					{ suit: 'Harten', rank: 'A' },
					{ suit: 'Harten', rank: 'K' },
				],
				1: [],
				2: [],
				3: [],
			},
			currentTrick: [
				{ card: { suit: 'Ruiten', rank: 'Q' }, seat: 3 },
			],
		});
		// Player 0 has only Harten, no Ruiten, no trump (Schoppen)
		const legalMoves = getLegalMovesForPlayer(game, 0);
		expect(legalMoves).toHaveLength(2); // Can play anything
		expect(legalMoves).toContainEqual({ suit: 'Harten', rank: 'A' });
		expect(legalMoves).toContainEqual({ suit: 'Harten', rank: 'K' });
	});
});

describe('game state structure', () => {
	it('should have correct initial structure', () => {
		const game = createGameState();

		expect(game.phase).toBe('playing');
		expect(game.round).toBe(1);
		expect(game.dealer).toBe(0);
		expect(game.trump).toBe('Schoppen');
		expect(game.playingTeam).toBe('WE');
		expect(game.currentPlayer).toBe(0);
		expect(game.hands).toBeDefined();
		expect(game.currentTrick).toEqual([]);
		expect(game.completedTricks).toEqual([]);
		expect(game.scores).toEqual({ NS: 0, WE: 0 });
		expect(game.roemClaims).toEqual([]);
	});

	it('should support all game phases', () => {
		const phases: MultiplayerGameState['phase'][] = ['dealing', 'trump', 'playing', 'scoring', 'roundEnd'];
		phases.forEach(phase => {
			const game = createGameState({ phase });
			expect(game.phase).toBe(phase);
		});
	});

	it('should track current trick correctly', () => {
		const game = createGameState({
			currentTrick: [
				{ card: { suit: 'Harten', rank: 'A' }, seat: 0 },
				{ card: { suit: 'Harten', rank: 'K' }, seat: 1 },
			],
		});

		expect(game.currentTrick).toHaveLength(2);
		expect(game.currentTrick[0].seat).toBe(0);
		expect(game.currentTrick[1].seat).toBe(1);
	});

	it('should track completed tricks correctly', () => {
		const game = createGameState({
			completedTricks: [
				{
					cards: [
						{ card: { suit: 'Harten', rank: 'A' }, seat: 0 },
						{ card: { suit: 'Harten', rank: 'K' }, seat: 1 },
						{ card: { suit: 'Harten', rank: 'Q' }, seat: 2 },
						{ card: { suit: 'Harten', rank: 'J' }, seat: 3 },
					],
					winner: 0,
					points: 20,
				},
			],
		});

		expect(game.completedTricks).toHaveLength(1);
		expect(game.completedTricks[0].winner).toBe(0);
		expect(game.completedTricks[0].points).toBe(20);
	});
});
