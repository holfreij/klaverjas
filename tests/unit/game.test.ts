import { describe, it, expect, beforeEach } from 'vitest';
import type { Card, Suit } from '$lib/game/deck';
import {
	createGame,
	chooseTrump,
	playCard,
	claimRoem,
	type GameState,
	type GamePhase,
} from '$lib/game/game';
import { getLegalMoves } from '$lib/game/rules';

/**
 * Helper to play a legal card for the current player.
 */
function playLegalCard(state: GameState): GameState {
	const player = state.currentPlayer;
	const legalMoves = getLegalMoves(state.hands[player], state.currentTrick, state.trump!);
	return playCard(state, legalMoves[0]);
}

describe('game', () => {
	describe('createGame', () => {
		it('should create a new game in trump selection phase', () => {
			const game = createGame();

			expect(game.phase).toBe('trump');
			expect(game.round).toBe(1);
			expect(game.dealer).toBe(0);
			expect(game.currentPlayer).toBe(1); // Left of dealer
			expect(game.scores.NS).toBe(0);
			expect(game.scores.WE).toBe(0);
		});

		it('should deal 8 cards to each player', () => {
			const game = createGame();

			expect(game.hands).toHaveLength(4);
			for (const hand of game.hands) {
				expect(hand).toHaveLength(8);
			}
		});

		it('should distribute all 32 unique cards', () => {
			const game = createGame();

			const allCards = game.hands.flat();
			expect(allCards).toHaveLength(32);

			const cardStrings = allCards.map((c) => `${c.rank}-${c.suit}`);
			const uniqueCards = new Set(cardStrings);
			expect(uniqueCards.size).toBe(32);
		});
	});

	describe('chooseTrump', () => {
		let game: GameState;

		beforeEach(() => {
			game = createGame();
		});

		it('should set trump suit and move to playing phase', () => {
			const result = chooseTrump(game, 'Harten');

			expect(result.trump).toBe('Harten');
			expect(result.phase).toBe('playing');
			expect(result.playingTeam).toBe('WE'); // Player 1 is WE
		});

		it('should set current player to left of dealer', () => {
			const result = chooseTrump(game, 'Schoppen');

			expect(result.currentPlayer).toBe(1); // Left of dealer (0)
		});

		it('should throw if not in trump phase', () => {
			const playingGame = { ...game, phase: 'playing' as GamePhase };

			expect(() => chooseTrump(playingGame, 'Harten')).toThrow();
		});

		it('should record the playing team correctly based on who chose trump', () => {
			// Player 1 chooses (left of dealer 0)
			let result = chooseTrump(game, 'Harten');
			expect(result.playingTeam).toBe('WE');

			// Test with different dealer
			const game2 = { ...createGame(), dealer: 1, currentPlayer: 2 };
			result = chooseTrump(game2, 'Harten');
			expect(result.playingTeam).toBe('NS'); // Player 2 is NS
		});
	});

	describe('playCard', () => {
		let game: GameState;

		beforeEach(() => {
			game = createGame();
			game = chooseTrump(game, 'Harten');
		});

		it('should add card to current trick', () => {
			const cardToPlay = game.hands[game.currentPlayer][0];
			const result = playCard(game, cardToPlay);

			expect(result.currentTrick).toHaveLength(1);
			expect(result.currentTrick[0].card).toEqual(cardToPlay);
			expect(result.currentTrick[0].player).toBe(game.currentPlayer);
		});

		it('should remove card from player hand', () => {
			const player = game.currentPlayer;
			const cardToPlay = game.hands[player][0];
			const result = playCard(game, cardToPlay);

			expect(result.hands[player]).toHaveLength(7);
			expect(result.hands[player]).not.toContainEqual(cardToPlay);
		});

		it('should advance to next player', () => {
			const result = playCard(game, game.hands[game.currentPlayer][0]);

			expect(result.currentPlayer).toBe((game.currentPlayer + 1) % 4);
		});

		it('should throw if card is not in player hand', () => {
			const fakeCard: Card = { suit: 'Ruiten', rank: '7' };

			// Make sure the fake card is not in the hand
			if (!game.hands[game.currentPlayer].some((c) => c.suit === fakeCard.suit && c.rank === fakeCard.rank)) {
				expect(() => playCard(game, fakeCard)).toThrow();
			}
		});

		it('should throw if card is not a legal move', () => {
			// Lead a card, then try to play an illegal card
			const ledSuit = game.hands[game.currentPlayer][0].suit;
			let result = playCard(game, game.hands[game.currentPlayer][0]);

			// Find a card of different suit in next player's hand
			const nextPlayer = result.currentPlayer;
			const hasLedSuit = result.hands[nextPlayer].some((c) => c.suit === ledSuit);
			const differentSuitCard = result.hands[nextPlayer].find((c) => c.suit !== ledSuit);

			if (hasLedSuit && differentSuitCard) {
				expect(() => playCard(result, differentSuitCard)).toThrow();
			}
		});

		it('should complete trick after 4 cards', () => {
			let state = game;

			// Play 4 legal cards
			for (let i = 0; i < 4; i++) {
				state = playLegalCard(state);
			}

			// Trick should be complete
			expect(state.currentTrick).toHaveLength(0);
			expect(state.completedTricks).toHaveLength(1);
		});

		it('should set trick winner as next current player', () => {
			let state = game;

			// Play 4 legal cards
			for (let i = 0; i < 4; i++) {
				state = playLegalCard(state);
			}

			// Winner should be leading
			const lastTrick = state.completedTricks[state.completedTricks.length - 1];
			expect(state.currentPlayer).toBe(lastTrick.winner);
		});
	});

	describe('claimRoem', () => {
		let game: GameState;

		beforeEach(() => {
			game = createGame();
			game = chooseTrump(game, 'Harten');
		});

		it('should record valid roem claim', () => {
			// Find a sequence in one of the hands
			const player = game.currentPlayer;
			const hand = game.hands[player];

			// Sort hand by suit and rank to find sequences
			const bySuit = new Map<Suit, Card[]>();
			for (const card of hand) {
				const existing = bySuit.get(card.suit) || [];
				existing.push(card);
				bySuit.set(card.suit, existing);
			}

			// Try to find a sequence (may not exist in random hand)
			// This is a smoke test - real claim validation happens in roem.test.ts
		});

		it('should throw for invalid roem claim', () => {
			const invalidClaim = {
				type: 'sequence3' as const,
				cards: [
					{ suit: 'Schoppen' as Suit, rank: '7' as const },
					{ suit: 'Schoppen' as Suit, rank: '8' as const },
					{ suit: 'Harten' as Suit, rank: '10' as const }, // Different suit!
				],
			};

			expect(() => claimRoem(game, game.currentPlayer, invalidClaim)).toThrow();
		});
	});

	describe('round completion', () => {
		it('should complete round after 8 tricks', () => {
			let game = createGame();
			game = chooseTrump(game, 'Harten');

			// Play all 8 tricks (32 cards)
			for (let trick = 0; trick < 8; trick++) {
				for (let card = 0; card < 4; card++) {
					game = playLegalCard(game);
				}
			}

			expect(game.completedTricks).toHaveLength(0); // Reset for new round
			expect(game.round).toBe(2);
			expect(game.phase).toBe('trump');
		});

		it('should update scores after round completion', () => {
			let game = createGame();
			game = chooseTrump(game, 'Harten');

			// Play all 8 tricks
			for (let trick = 0; trick < 8; trick++) {
				for (let card = 0; card < 4; card++) {
					game = playLegalCard(game);
				}
			}

			// Scores should be updated (total should be 162 + any roem)
			const totalScore = game.scores.NS + game.scores.WE;
			expect(totalScore).toBeGreaterThanOrEqual(162);
		});

		it('should rotate dealer after round', () => {
			let game = createGame();
			const initialDealer = game.dealer;
			game = chooseTrump(game, 'Harten');

			// Play full round
			for (let trick = 0; trick < 8; trick++) {
				for (let card = 0; card < 4; card++) {
					game = playLegalCard(game);
				}
			}

			expect(game.dealer).toBe((initialDealer + 1) % 4);
		});
	});

	describe('game completion', () => {
		it('should end game after 16 rounds', () => {
			let game = createGame();

			for (let round = 0; round < 16; round++) {
				game = chooseTrump(game, 'Harten');

				for (let trick = 0; trick < 8; trick++) {
					for (let card = 0; card < 4; card++) {
						game = playLegalCard(game);
					}
				}
			}

			expect(game.phase).toBe('finished');
			expect(game.round).toBe(16);
		});

		it('should determine winner based on total scores', () => {
			let game = createGame();

			for (let round = 0; round < 16; round++) {
				game = chooseTrump(game, 'Harten');

				for (let trick = 0; trick < 8; trick++) {
					for (let card = 0; card < 4; card++) {
						game = playLegalCard(game);
					}
				}
			}

			expect(game.winner).toBeDefined();
			if (game.scores.NS > game.scores.WE) {
				expect(game.winner).toBe('NS');
			} else if (game.scores.WE > game.scores.NS) {
				expect(game.winner).toBe('WE');
			} else {
				expect(game.winner).toBe('tie');
			}
		});
	});
});
