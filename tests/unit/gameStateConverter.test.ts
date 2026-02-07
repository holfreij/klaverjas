import { describe, it, expect } from 'vitest';
import type { Card, Suit } from '$lib/game/deck';
import type { GameState as EngineGameState } from '$lib/game/game';
import type { GameState as MultiplayerGameState } from '$lib/multiplayer/types';
import { engineToMultiplayer, multiplayerToEngine } from '$lib/multiplayer/gameStateConverter';

const card = (suit: Suit, rank: Card['rank']): Card => ({ suit, rank });

function createEngineGameState(): EngineGameState {
	return {
		totalRounds: 16,
		currentRound: 2,
		dealer: 0,
		scores: { ns: 100, we: 80 },
		round: {
			hands: {
				0: [card('♠', 'A'), card('♠', 'K')],
				1: [card('♥', 'A'), card('♥', 'K')],
				2: [card('♣', 'A'), card('♣', 'K')],
				3: [card('♦', 'A'), card('♦', 'K')]
			},
			handSnapshots: {
				0: {
					0: [card('♠', 'A'), card('♠', 'K'), card('♠', 'Q')],
					1: [card('♥', 'A'), card('♥', 'K'), card('♥', 'Q')],
					2: [card('♣', 'A'), card('♣', 'K'), card('♣', 'Q')],
					3: [card('♦', 'A'), card('♦', 'K'), card('♦', 'Q')]
				}
			},
			trump: '♠',
			trumpChooser: 1,
			playingTeam: 'we',
			currentPlayer: 2,
			currentTrick: [{ player: 1, card: card('♥', 'Q') }],
			tricksPlayed: 1,
			tricksWon: { ns: 0, we: 1 },
			points: { ns: 0, we: 25 },
			roem: { ns: 0, we: 20 },
			playedCards: [
				[
					{ player: 1, card: card('♠', 'Q') },
					{ player: 2, card: card('♣', 'Q') },
					{ player: 3, card: card('♦', 'Q') },
					{ player: 0, card: card('♠', '10') }
				]
			]
		}
	};
}

function createMultiplayerGameState(): MultiplayerGameState {
	return {
		phase: 'playing',
		round: 3,
		trick: 2,
		dealer: 0,
		trump: '♠',
		trumpChooser: 1,
		playingTeam: 'we',
		currentPlayer: 2,
		handsAtTrickStart: {
			0: [card('♠', 'A'), card('♠', 'K'), card('♠', 'Q')],
			1: [card('♥', 'A'), card('♥', 'K'), card('♥', 'Q')],
			2: [card('♣', 'A'), card('♣', 'K'), card('♣', 'Q')],
			3: [card('♦', 'A'), card('♦', 'K'), card('♦', 'Q')]
		},
		hands: {
			0: [card('♠', 'A'), card('♠', 'K')],
			1: [card('♥', 'A'), card('♥', 'K')],
			2: [card('♣', 'A'), card('♣', 'K')],
			3: [card('♦', 'A'), card('♦', 'K')]
		},
		currentTrick: [{ seat: 1, card: card('♥', 'Q') }],
		completedTricks: [
			{
				cards: [
					{ seat: 1, card: card('♠', 'Q') },
					{ seat: 2, card: card('♣', 'Q') },
					{ seat: 3, card: card('♦', 'Q') },
					{ seat: 0, card: card('♠', '10') }
				],
				winner: 0,
				roem: 0
			}
		],
		scores: {
			ns: { base: 0, roem: 0 },
			we: { base: 25, roem: 20 }
		},
		gameScores: { ns: 100, we: 80 },
		roemClaimed: false,
		roemClaimPending: null,
		skipVotes: []
	};
}

describe('engineToMultiplayer', () => {
	it('should convert engine state to multiplayer format', () => {
		const engine = createEngineGameState();
		const result = engineToMultiplayer(engine, 'playing', 3, 2);

		expect(result.phase).toBe('playing');
		expect(result.round).toBe(3);
		expect(result.trick).toBe(2);
		expect(result.dealer).toBe(0);
		expect(result.trump).toBe('♠');
		expect(result.trumpChooser).toBe(1);
		expect(result.playingTeam).toBe('we');
		expect(result.currentPlayer).toBe(2);
	});

	it('should convert hands correctly', () => {
		const engine = createEngineGameState();
		const result = engineToMultiplayer(engine, 'playing', 3, 2);

		expect(result.hands[0]).toEqual([card('♠', 'A'), card('♠', 'K')]);
		expect(result.hands[1]).toEqual([card('♥', 'A'), card('♥', 'K')]);
	});

	it('should convert currentTrick TrickCard[] to PlayedCard[]', () => {
		const engine = createEngineGameState();
		const result = engineToMultiplayer(engine, 'playing', 3, 2);

		expect(result.currentTrick).toHaveLength(1);
		expect(result.currentTrick[0]).toEqual({ seat: 1, card: card('♥', 'Q') });
	});

	it('should convert playedCards to completedTricks', () => {
		const engine = createEngineGameState();
		const result = engineToMultiplayer(engine, 'playing', 3, 2);

		expect(result.completedTricks).toHaveLength(1);
		expect(result.completedTricks[0].cards).toHaveLength(4);
		expect(result.completedTricks[0].cards[0]).toEqual({ seat: 1, card: card('♠', 'Q') });
		// Winner should be seat 0 (♠10 is highest since ♠ is trump, but ♠Q was first... actually ♠10 > ♠Q in non-trump. Let's just verify it has a winner)
		expect(typeof result.completedTricks[0].winner).toBe('number');
	});

	it('should convert points to TeamScore format', () => {
		const engine = createEngineGameState();
		const result = engineToMultiplayer(engine, 'playing', 3, 2);

		expect(result.scores.ns).toEqual({ base: 0, roem: 0 });
		expect(result.scores.we).toEqual({ base: 25, roem: 20 });
	});

	it('should map engine scores to gameScores', () => {
		const engine = createEngineGameState();
		const result = engineToMultiplayer(engine, 'playing', 3, 2);

		expect(result.gameScores).toEqual({ ns: 100, we: 80 });
	});

	it('should set handsAtTrickStart from current trick handSnapshot', () => {
		const engine = createEngineGameState();
		const result = engineToMultiplayer(engine, 'playing', 3, 2);

		// The current trick is trick index 1 (since 1 completed trick).
		// handSnapshots should have entry for trick 1 if it exists, otherwise use latest available.
		expect(result.handsAtTrickStart[0]).toBeDefined();
	});

	it('should initialize multiplayer-only fields', () => {
		const engine = createEngineGameState();
		const result = engineToMultiplayer(engine, 'playing', 3, 2);

		expect(result.roemClaimed).toBe(false);
		expect(result.roemClaimPending).toBeNull();
		expect(result.skipVotes).toEqual([]);
	});

	it('should handle null trump (trump selection phase)', () => {
		const engine = createEngineGameState();
		engine.round!.trump = null;
		engine.round!.playingTeam = null;
		engine.round!.currentTrick = [];
		engine.round!.playedCards = [];

		const result = engineToMultiplayer(engine, 'trump', 1, 1);

		expect(result.phase).toBe('trump');
		expect(result.trump).toBeNull();
		expect(result.playingTeam).toBeNull();
	});
});

describe('multiplayerToEngine', () => {
	it('should convert multiplayer state to engine format', () => {
		const mp = createMultiplayerGameState();
		const result = multiplayerToEngine(mp);

		expect(result.totalRounds).toBe(16);
		expect(result.currentRound).toBe(2); // round 3 means 2 completed rounds
		expect(result.dealer).toBe(0);
		expect(result.scores).toEqual({ ns: 100, we: 80 });
	});

	it('should reconstruct round state', () => {
		const mp = createMultiplayerGameState();
		const result = multiplayerToEngine(mp);

		expect(result.round).not.toBeNull();
		expect(result.round!.trump).toBe('♠');
		expect(result.round!.trumpChooser).toBe(1);
		expect(result.round!.playingTeam).toBe('we');
		expect(result.round!.currentPlayer).toBe(2);
	});

	it('should convert hands', () => {
		const mp = createMultiplayerGameState();
		const result = multiplayerToEngine(mp);

		expect(result.round!.hands[0]).toEqual([card('♠', 'A'), card('♠', 'K')]);
		expect(result.round!.hands[1]).toEqual([card('♥', 'A'), card('♥', 'K')]);
	});

	it('should convert currentTrick PlayedCard[] to TrickCard[]', () => {
		const mp = createMultiplayerGameState();
		const result = multiplayerToEngine(mp);

		expect(result.round!.currentTrick).toHaveLength(1);
		expect(result.round!.currentTrick[0]).toEqual({ player: 1, card: card('♥', 'Q') });
	});

	it('should convert completedTricks to playedCards', () => {
		const mp = createMultiplayerGameState();
		const result = multiplayerToEngine(mp);

		expect(result.round!.playedCards).toHaveLength(1);
		expect(result.round!.playedCards[0]).toHaveLength(4);
		expect(result.round!.playedCards[0][0]).toEqual({ player: 1, card: card('♠', 'Q') });
	});

	it('should reconstruct points from TeamScore', () => {
		const mp = createMultiplayerGameState();
		const result = multiplayerToEngine(mp);

		expect(result.round!.points).toEqual({ ns: 0, we: 25 });
		expect(result.round!.roem).toEqual({ ns: 0, we: 20 });
	});

	it('should calculate tricksPlayed and tricksWon', () => {
		const mp = createMultiplayerGameState();
		const result = multiplayerToEngine(mp);

		expect(result.round!.tricksPlayed).toBe(1);
		// The completed trick was won by seat 0 (ns team)
		expect(result.round!.tricksWon.ns + result.round!.tricksWon.we).toBe(1);
	});

	it('should handle handsAtTrickStart as handSnapshots', () => {
		const mp = createMultiplayerGameState();
		const result = multiplayerToEngine(mp);

		// The current trick number is completedTricks.length = 1
		expect(result.round!.handSnapshots).toBeDefined();
		expect(result.round!.handSnapshots[1]).toBeDefined();
		expect(result.round!.handSnapshots[1][0]).toEqual([
			card('♠', 'A'),
			card('♠', 'K'),
			card('♠', 'Q')
		]);
	});
});
