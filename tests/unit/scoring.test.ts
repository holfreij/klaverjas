import { describe, it, expect } from 'vitest';
import type { Card, Suit } from '$lib/game/deck';
import {
	calculateTrickPoints,
	calculateRoundResult,
	type TrickResult,
	type Team,
} from '$lib/game/scoring';

describe('scoring', () => {
	const trump: Suit = 'hearts';

	describe('calculateTrickPoints', () => {
		it('should sum point values of all cards', () => {
			const cards: Card[] = [
				{ suit: 'spades', rank: 'A' }, // 11
				{ suit: 'spades', rank: '10' }, // 10
				{ suit: 'spades', rank: 'K' }, // 4
				{ suit: 'spades', rank: '7' }, // 0
			];

			expect(calculateTrickPoints(cards, trump)).toBe(25);
		});

		it('should use trump values for trump cards', () => {
			const cards: Card[] = [
				{ suit: 'hearts', rank: 'J' }, // 20 (trump Nel)
				{ suit: 'hearts', rank: '9' }, // 14 (trump Nell)
				{ suit: 'spades', rank: 'A' }, // 11
				{ suit: 'spades', rank: '7' }, // 0
			];

			expect(calculateTrickPoints(cards, trump)).toBe(45);
		});

		it('should return 0 for empty array', () => {
			expect(calculateTrickPoints([], trump)).toBe(0);
		});
	});

	describe('calculateRoundResult', () => {
		describe('normal game', () => {
			it('should award points to each team based on tricks won', () => {
				const tricks: TrickResult[] = [
					// NS wins 5 tricks with 100 points, WE wins 3 tricks with 52 points
					{ cards: makeCards(20), winner: 0, points: 20, lastTrick: false }, // NS
					{ cards: makeCards(20), winner: 1, points: 20, lastTrick: false }, // WE
					{ cards: makeCards(20), winner: 2, points: 20, lastTrick: false }, // NS
					{ cards: makeCards(20), winner: 3, points: 20, lastTrick: false }, // WE
					{ cards: makeCards(20), winner: 0, points: 20, lastTrick: false }, // NS
					{ cards: makeCards(12), winner: 1, points: 12, lastTrick: false }, // WE
					{ cards: makeCards(20), winner: 2, points: 20, lastTrick: false }, // NS
					{ cards: makeCards(20), winner: 2, points: 20, lastTrick: true }, // NS (last trick)
				];

				const result = calculateRoundResult(tricks, 'NS', { NS: 0, WE: 0 });

				// NS: 100 + 10 (last trick) = 110 points
				// WE: 52 points
				expect(result.NS).toBe(110);
				expect(result.WE).toBe(52);
			});

			it('should add 10 point bonus for last trick winner', () => {
				const tricks: TrickResult[] = [
					{ cards: makeCards(50), winner: 0, points: 50, lastTrick: false }, // NS
					{ cards: makeCards(50), winner: 1, points: 50, lastTrick: false }, // WE
					{ cards: makeCards(32), winner: 2, points: 32, lastTrick: false }, // NS
					{ cards: makeCards(10), winner: 3, points: 10, lastTrick: false }, // WE
					{ cards: makeCards(5), winner: 0, points: 5, lastTrick: false }, // NS
					{ cards: makeCards(2), winner: 1, points: 2, lastTrick: false }, // WE
					{ cards: makeCards(2), winner: 0, points: 2, lastTrick: false }, // NS
					{ cards: makeCards(1), winner: 0, points: 1, lastTrick: true }, // NS (last trick)
				];

				const result = calculateRoundResult(tricks, 'NS', { NS: 0, WE: 0 });

				// NS: 50 + 32 + 5 + 2 + 1 + 10 = 100 points
				// WE: 50 + 10 + 2 = 62 points
				expect(result.NS).toBe(100);
				expect(result.WE).toBe(62);
			});
		});

		describe('nat (playing team fails)', () => {
			it('should give 0 to playing team and 162 to opponents when playing team has fewer points', () => {
				const tricks: TrickResult[] = [
					{ cards: makeCards(40), winner: 0, points: 40, lastTrick: false }, // NS
					{ cards: makeCards(40), winner: 1, points: 40, lastTrick: false }, // WE
					{ cards: makeCards(40), winner: 3, points: 40, lastTrick: false }, // WE
					{ cards: makeCards(32), winner: 3, points: 32, lastTrick: true }, // WE (last trick)
				];

				// NS is playing team but only has 40 points (needs > 81 to win)
				const result = calculateRoundResult(tricks, 'NS', { NS: 0, WE: 0 });

				expect(result.NS).toBe(0);
				expect(result.WE).toBe(162);
			});

			it('should give 0 to playing team and 162 to opponents when exactly tied (nat)', () => {
				// Exactly 81-81 split means playing team goes nat
				const tricks: TrickResult[] = [
					{ cards: makeCards(81), winner: 0, points: 81, lastTrick: false }, // NS
					{ cards: makeCards(71), winner: 1, points: 71, lastTrick: true }, // WE (+ 10 = 81)
				];

				const result = calculateRoundResult(tricks, 'NS', { NS: 0, WE: 0 });

				// Playing team (NS) needs > 81 to win, exactly 81 is nat
				expect(result.NS).toBe(0);
				expect(result.WE).toBe(162);
			});
		});

		describe('pit (playing team wins all tricks)', () => {
			it('should add 100 bonus points when playing team wins all 8 tricks', () => {
				const tricks: TrickResult[] = Array(8).fill(null).map((_, i) => ({
					cards: makeCards(19),
					winner: i % 2 === 0 ? 0 : 2, // Only NS (0, 2)
					points: 19,
					lastTrick: i === 7,
				}));

				const result = calculateRoundResult(tricks, 'NS', { NS: 0, WE: 0 });

				// 152 card points + 10 last trick + 100 pit = 262
				expect(result.NS).toBe(262);
				expect(result.WE).toBe(0);
			});

			it('should NOT award pit bonus when defending team wins all tricks', () => {
				const tricks: TrickResult[] = Array(8).fill(null).map((_, i) => ({
					cards: makeCards(19),
					winner: i % 2 === 0 ? 1 : 3, // Only WE (1, 3)
					points: 19,
					lastTrick: i === 7,
				}));

				// NS is playing team but WE wins all tricks
				const result = calculateRoundResult(tricks, 'NS', { NS: 0, WE: 0 });

				// This is a nat, not a pit for WE
				expect(result.NS).toBe(0);
				expect(result.WE).toBe(162); // No pit bonus for defending team
			});
		});

		describe('roem', () => {
			it('should add roem points to the team that wins the trick', () => {
				const tricks: TrickResult[] = [
					{ cards: makeCards(40), winner: 0, points: 40, roem: 20, lastTrick: false }, // NS wins trick with roem
					{ cards: makeCards(40), winner: 1, points: 40, lastTrick: false }, // WE
					{ cards: makeCards(40), winner: 3, points: 40, lastTrick: false }, // WE
					{ cards: makeCards(32), winner: 2, points: 32, lastTrick: true }, // NS (last trick)
				];

				const result = calculateRoundResult(tricks, 'NS', { NS: 0, WE: 0 });

				// NS: 40 + 32 + 10 + 20 (roem) = 102
				// WE: 80
				expect(result.NS).toBe(102);
				expect(result.WE).toBe(80);
			});

			it('should give all roem to opponents when playing team goes nat', () => {
				const tricks: TrickResult[] = [
					{ cards: makeCards(30), winner: 0, points: 30, roem: 20, lastTrick: false }, // NS
					{ cards: makeCards(50), winner: 1, points: 50, lastTrick: false }, // WE
					{ cards: makeCards(40), winner: 3, points: 40, lastTrick: false }, // WE
					{ cards: makeCards(32), winner: 3, points: 32, lastTrick: true }, // WE
				];

				// NS is playing team but goes nat
				const result = calculateRoundResult(tricks, 'NS', { NS: 0, WE: 0 });

				// NS goes nat: gets 0
				// WE gets 162 + 20 (roem from NS's trick) = 182
				expect(result.NS).toBe(0);
				expect(result.WE).toBe(182);
			});
		});
	});
});

/**
 * Helper to create placeholder cards for a given point total.
 */
function makeCards(points: number): Card[] {
	// Just return dummy cards - scoring uses pre-calculated points
	return [
		{ suit: 'spades', rank: '7' },
		{ suit: 'spades', rank: '8' },
		{ suit: 'spades', rank: '9' },
		{ suit: 'spades', rank: '10' },
	];
}
