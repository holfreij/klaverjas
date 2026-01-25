import { describe, it, expect } from 'vitest';
import type { Card, Suit } from '$lib/game/deck';
import {
	getLegalMoves,
	getTrickWinner,
	type PlayedCard,
} from '$lib/game/rules';

describe('rules', () => {
	describe('getLegalMoves', () => {
		const trump: Suit = 'Harten';

		describe('when hand has led suit', () => {
			it('should only allow cards of the led suit', () => {
				const hand: Card[] = [
					{ suit: 'Schoppen', rank: 'A' },
					{ suit: 'Schoppen', rank: '7' },
					{ suit: 'Harten', rank: 'J' },
					{ suit: 'Klaver', rank: 'K' },
				];
				const trick: PlayedCard[] = [
					{ card: { suit: 'Schoppen', rank: '10' }, player: 0 },
				];

				const legal = getLegalMoves(hand, trick, trump);

				expect(legal).toHaveLength(2);
				expect(legal).toContainEqual({ suit: 'Schoppen', rank: 'A' });
				expect(legal).toContainEqual({ suit: 'Schoppen', rank: '7' });
			});
		});

		describe('when hand has no led suit but has trump', () => {
			it('should require playing trump when trick has no trump', () => {
				const hand: Card[] = [
					{ suit: 'Harten', rank: 'J' }, // trump
					{ suit: 'Harten', rank: '7' }, // trump
					{ suit: 'Klaver', rank: 'K' },
				];
				const trick: PlayedCard[] = [
					{ card: { suit: 'Schoppen', rank: 'A' }, player: 0 },
				];

				const legal = getLegalMoves(hand, trick, trump);

				expect(legal).toHaveLength(2);
				expect(legal.every((c) => c.suit === 'Harten')).toBe(true);
			});

			it('should require higher trump when trick has trump and player can beat it', () => {
				const hand: Card[] = [
					{ suit: 'Harten', rank: 'J' }, // trump Nel - can beat
					{ suit: 'Harten', rank: '7' }, // trump - cannot beat
					{ suit: 'Klaver', rank: 'K' },
				];
				const trick: PlayedCard[] = [
					{ card: { suit: 'Schoppen', rank: 'A' }, player: 0 },
					{ card: { suit: 'Harten', rank: '9' }, player: 1 }, // trump Nell
				];

				const legal = getLegalMoves(hand, trick, trump);

				expect(legal).toHaveLength(1);
				expect(legal[0]).toEqual({ suit: 'Harten', rank: 'J' });
			});

			it('should allow any trump when trick has trump and player cannot beat it (under-trump)', () => {
				const hand: Card[] = [
					{ suit: 'Harten', rank: 'A' }, // trump - cannot beat J
					{ suit: 'Harten', rank: '7' }, // trump - cannot beat J
					{ suit: 'Klaver', rank: 'K' },
				];
				const trick: PlayedCard[] = [
					{ card: { suit: 'Schoppen', rank: 'A' }, player: 0 },
					{ card: { suit: 'Harten', rank: 'J' }, player: 1 }, // trump Nel
				];

				const legal = getLegalMoves(hand, trick, trump);

				expect(legal).toHaveLength(2);
				expect(legal.every((c) => c.suit === 'Harten')).toBe(true);
			});

			it('should enforce Rotterdam rule: must trump even if partner is winning', () => {
				// Player 0 leads, Player 1 (partner of Player 3) plays high
				// Player 2 cannot follow but has trump - must trump even though partner winning
				const hand: Card[] = [
					{ suit: 'Harten', rank: '7' }, // trump
					{ suit: 'Klaver', rank: 'K' },
				];
				const trick: PlayedCard[] = [
					{ card: { suit: 'Schoppen', rank: '7' }, player: 0 },
					{ card: { suit: 'Schoppen', rank: 'A' }, player: 1 },
				];

				// Player 2's turn - partner (player 0) is losing, but that doesn't matter
				// In Rotterdam rules, must always trump when can't follow suit
				const legal = getLegalMoves(hand, trick, trump);

				expect(legal).toHaveLength(1);
				expect(legal[0]).toEqual({ suit: 'Harten', rank: '7' });
			});
		});

		describe('when hand has no led suit and no trump', () => {
			it('should allow playing any card', () => {
				const hand: Card[] = [
					{ suit: 'Klaver', rank: 'A' },
					{ suit: 'Ruiten', rank: 'K' },
				];
				const trick: PlayedCard[] = [
					{ card: { suit: 'Schoppen', rank: 'A' }, player: 0 },
				];

				const legal = getLegalMoves(hand, trick, trump);

				expect(legal).toHaveLength(2);
			});
		});

		describe('when leading', () => {
			it('should allow playing any card from hand', () => {
				const hand: Card[] = [
					{ suit: 'Schoppen', rank: 'A' },
					{ suit: 'Harten', rank: 'J' },
					{ suit: 'Klaver', rank: 'K' },
					{ suit: 'Ruiten', rank: '7' },
				];
				const trick: PlayedCard[] = [];

				const legal = getLegalMoves(hand, trick, trump);

				expect(legal).toHaveLength(4);
				expect(legal).toEqual(hand);
			});
		});

		describe('edge cases', () => {
			it('should handle empty hand', () => {
				const hand: Card[] = [];
				const trick: PlayedCard[] = [
					{ card: { suit: 'Schoppen', rank: 'A' }, player: 0 },
				];

				const legal = getLegalMoves(hand, trick, trump);

				expect(legal).toHaveLength(0);
			});

			it('should handle trump being led', () => {
				const hand: Card[] = [
					{ suit: 'Harten', rank: 'A' }, // trump
					{ suit: 'Harten', rank: '7' }, // trump
					{ suit: 'Schoppen', rank: 'K' },
				];
				const trick: PlayedCard[] = [
					{ card: { suit: 'Harten', rank: 'J' }, player: 0 }, // trump led
				];

				const legal = getLegalMoves(hand, trick, trump);

				// Must follow suit (which is trump)
				expect(legal).toHaveLength(2);
				expect(legal.every((c) => c.suit === 'Harten')).toBe(true);
			});

			it('should handle only having one legal card', () => {
				const hand: Card[] = [
					{ suit: 'Schoppen', rank: '7' },
					{ suit: 'Klaver', rank: 'A' },
					{ suit: 'Klaver', rank: 'K' },
				];
				const trick: PlayedCard[] = [
					{ card: { suit: 'Schoppen', rank: 'A' }, player: 0 },
				];

				const legal = getLegalMoves(hand, trick, trump);

				expect(legal).toHaveLength(1);
				expect(legal[0]).toEqual({ suit: 'Schoppen', rank: '7' });
			});
		});
	});

	describe('getTrickWinner', () => {
		const trump: Suit = 'Harten';

		it('should return highest card of led suit when no trump played', () => {
			const trick: PlayedCard[] = [
				{ card: { suit: 'Schoppen', rank: '7' }, player: 0 },
				{ card: { suit: 'Schoppen', rank: 'A' }, player: 1 },
				{ card: { suit: 'Schoppen', rank: '10' }, player: 2 },
				{ card: { suit: 'Schoppen', rank: 'K' }, player: 3 },
			];

			expect(getTrickWinner(trick, trump)).toBe(1); // Ace is highest
		});

		it('should return highest trump when trump was played', () => {
			const trick: PlayedCard[] = [
				{ card: { suit: 'Schoppen', rank: 'A' }, player: 0 },
				{ card: { suit: 'Harten', rank: '7' }, player: 1 }, // trump
				{ card: { suit: 'Harten', rank: '9' }, player: 2 }, // trump Nell
				{ card: { suit: 'Schoppen', rank: 'K' }, player: 3 },
			];

			expect(getTrickWinner(trick, trump)).toBe(2); // Nell is second highest trump
		});

		it('should return trump Jack (Nel) as highest when played', () => {
			const trick: PlayedCard[] = [
				{ card: { suit: 'Schoppen', rank: 'A' }, player: 0 },
				{ card: { suit: 'Harten', rank: 'J' }, player: 1 }, // trump Nel
				{ card: { suit: 'Harten', rank: '9' }, player: 2 }, // trump Nell
				{ card: { suit: 'Harten', rank: 'A' }, player: 3 }, // trump Ace
			];

			expect(getTrickWinner(trick, trump)).toBe(1); // Nel is highest trump
		});

		it('should ignore cards that don\'t follow suit and aren\'t trump', () => {
			const trick: PlayedCard[] = [
				{ card: { suit: 'Schoppen', rank: '7' }, player: 0 },
				{ card: { suit: 'Klaver', rank: 'A' }, player: 1 }, // doesn't follow, not trump
				{ card: { suit: 'Schoppen', rank: '8' }, player: 2 },
				{ card: { suit: 'Ruiten', rank: 'A' }, player: 3 }, // doesn't follow, not trump
			];

			expect(getTrickWinner(trick, trump)).toBe(2); // 8 of Schoppen is highest spade
		});

		it('should handle led suit being trump', () => {
			const trick: PlayedCard[] = [
				{ card: { suit: 'Harten', rank: '7' }, player: 0 }, // trump led
				{ card: { suit: 'Harten', rank: 'A' }, player: 1 }, // trump
				{ card: { suit: 'Harten', rank: '9' }, player: 2 }, // trump Nell
				{ card: { suit: 'Harten', rank: '8' }, player: 3 }, // trump
			];

			expect(getTrickWinner(trick, trump)).toBe(2); // Nell is second highest
		});

		it('should return first player for single-card trick', () => {
			const trick: PlayedCard[] = [
				{ card: { suit: 'Schoppen', rank: '7' }, player: 2 },
			];

			expect(getTrickWinner(trick, trump)).toBe(2);
		});

		it('should throw for empty trick', () => {
			expect(() => getTrickWinner([], trump)).toThrow();
		});
	});
});
