import { describe, it, expect } from 'vitest';
import type { Card, Suit } from '$lib/game/deck';
import {
	getLegalMoves,
	isLegalMove,
	determineTrickWinner,
	getCardStrength,
	checkAllMovesInRound,
	type PlayedMove
} from '$lib/game/rules';

// Helper to create cards quickly
const card = (suit: Suit, rank: Card['rank']): Card => ({ suit, rank });

describe('getCardStrength', () => {
	describe('trump cards', () => {
		it('should rank J as highest (value 7)', () => {
			expect(getCardStrength(card('♠', 'J'), '♠')).toBe(7);
		});

		it('should rank 9 as second highest (value 6)', () => {
			expect(getCardStrength(card('♠', '9'), '♠')).toBe(6);
		});

		it('should rank A as third highest (value 5)', () => {
			expect(getCardStrength(card('♠', 'A'), '♠')).toBe(5);
		});

		it('should rank 10 as fourth highest (value 4)', () => {
			expect(getCardStrength(card('♠', '10'), '♠')).toBe(4);
		});

		it('should rank K, Q, 8, 7 in descending order', () => {
			expect(getCardStrength(card('♠', 'K'), '♠')).toBe(3);
			expect(getCardStrength(card('♠', 'Q'), '♠')).toBe(2);
			expect(getCardStrength(card('♠', '8'), '♠')).toBe(1);
			expect(getCardStrength(card('♠', '7'), '♠')).toBe(0);
		});
	});

	describe('non-trump cards', () => {
		it('should rank A as highest (value 7)', () => {
			expect(getCardStrength(card('♥', 'A'), '♠')).toBe(7);
		});

		it('should rank 10 as second highest (value 6)', () => {
			expect(getCardStrength(card('♥', '10'), '♠')).toBe(6);
		});

		it('should rank K, Q, J, 9, 8, 7 in descending order', () => {
			expect(getCardStrength(card('♥', 'K'), '♠')).toBe(5);
			expect(getCardStrength(card('♥', 'Q'), '♠')).toBe(4);
			expect(getCardStrength(card('♥', 'J'), '♠')).toBe(3);
			expect(getCardStrength(card('♥', '9'), '♠')).toBe(2);
			expect(getCardStrength(card('♥', '8'), '♠')).toBe(1);
			expect(getCardStrength(card('♥', '7'), '♠')).toBe(0);
		});
	});
});

describe('getLegalMoves', () => {
	describe('first card of trick', () => {
		it('should allow any card when leading', () => {
			const hand: Card[] = [card('♠', 'A'), card('♥', 'K'), card('♣', 'Q'), card('♦', 'J')];
			const legal = getLegalMoves(hand, [], '♠');
			expect(legal).toEqual(hand);
		});
	});

	describe('following suit', () => {
		it('should only allow cards of led suit when player has them', () => {
			const hand: Card[] = [card('♠', 'A'), card('♠', 'K'), card('♥', 'Q'), card('♦', 'J')];
			const trick: Card[] = [card('♠', '10')];
			const legal = getLegalMoves(hand, trick, '♥');
			expect(legal).toEqual([card('♠', 'A'), card('♠', 'K')]);
		});

		it('should allow single card when only one of led suit', () => {
			const hand: Card[] = [card('♠', '7'), card('♥', 'Q'), card('♣', 'J'), card('♦', '9')];
			const trick: Card[] = [card('♠', 'A')];
			const legal = getLegalMoves(hand, trick, '♥');
			expect(legal).toEqual([card('♠', '7')]);
		});
	});

	describe('must trump when cannot follow suit', () => {
		it('should require trumping when no led suit and no trump in trick', () => {
			const hand: Card[] = [card('♥', 'A'), card('♥', 'K'), card('♣', 'Q'), card('♦', 'J')];
			const trick: Card[] = [card('♠', '10')];
			const legal = getLegalMoves(hand, trick, '♥');
			expect(legal).toEqual([card('♥', 'A'), card('♥', 'K')]);
		});

		it('should require trumping even if partner is winning (Rotterdam rule)', () => {
			const hand: Card[] = [card('♥', '7'), card('♣', 'Q'), card('♦', 'J')];
			// Partner (2 cards ago) played highest card, but still must trump
			const trick: Card[] = [card('♠', 'A'), card('♠', '7')];
			const legal = getLegalMoves(hand, trick, '♥');
			expect(legal).toEqual([card('♥', '7')]);
		});
	});

	describe('over-trumping', () => {
		it('should require over-trump when trump in trick and has higher trump', () => {
			const hand: Card[] = [card('♥', 'J'), card('♥', '9'), card('♥', '7'), card('♣', 'A')];
			const trick: Card[] = [card('♠', '10'), card('♥', 'K')]; // ♥K is trump
			const legal = getLegalMoves(hand, trick, '♥');
			// Must play J or 9 (both beat K)
			expect(legal).toEqual([card('♥', 'J'), card('♥', '9')]);
		});

		it('should require over-trump when multiple trumps in trick', () => {
			const hand: Card[] = [card('♥', 'J'), card('♥', '8'), card('♣', 'A')];
			// Two trumps played, highest is 9
			const trick: Card[] = [card('♠', '10'), card('♥', '7'), card('♥', '9')];
			const legal = getLegalMoves(hand, trick, '♥');
			// Only J beats 9
			expect(legal).toEqual([card('♥', 'J')]);
		});
	});

	describe('under-trumping', () => {
		it('should allow under-trump when cannot over-trump but has trump', () => {
			const hand: Card[] = [card('♥', '8'), card('♥', '7'), card('♣', 'A')];
			const trick: Card[] = [card('♠', '10'), card('♥', 'J')]; // ♥J is highest trump
			const legal = getLegalMoves(hand, trick, '♥');
			// Must under-trump (can't beat J, but has trump)
			expect(legal).toEqual([card('♥', '8'), card('♥', '7')]);
		});
	});

	describe('no trump available', () => {
		it('should allow any card when cannot follow suit and has no trump', () => {
			const hand: Card[] = [card('♣', 'A'), card('♣', 'K'), card('♦', 'Q'), card('♦', 'J')];
			const trick: Card[] = [card('♠', '10')];
			const legal = getLegalMoves(hand, trick, '♥');
			expect(legal).toEqual(hand);
		});
	});

	describe('leading trump suit', () => {
		it('should allow following trump when trump was led', () => {
			const hand: Card[] = [card('♥', 'J'), card('♥', '8'), card('♠', 'A'), card('♦', 'K')];
			const trick: Card[] = [card('♥', 'A')]; // Trump led
			const legal = getLegalMoves(hand, trick, '♥');
			// Must follow trump suit
			expect(legal).toEqual([card('♥', 'J'), card('♥', '8')]);
		});
	});
});

describe('isLegalMove', () => {
	it('should return true for a legal move', () => {
		const hand: Card[] = [card('♠', 'A'), card('♥', 'K')];
		const trick: Card[] = [card('♠', '10')];
		expect(isLegalMove(card('♠', 'A'), hand, trick, '♥')).toBe(true);
	});

	it('should return false for an illegal move', () => {
		const hand: Card[] = [card('♠', 'A'), card('♥', 'K')];
		const trick: Card[] = [card('♠', '10')];
		// Has spades, must follow suit, can't play hearts
		expect(isLegalMove(card('♥', 'K'), hand, trick, '♥')).toBe(false);
	});
});

describe('determineTrickWinner', () => {
	it('should return winner when no trump played - highest of led suit wins', () => {
		const trick: Card[] = [card('♠', '10'), card('♠', 'A'), card('♠', 'K'), card('♠', '7')];
		// A is highest, played at index 1
		expect(determineTrickWinner(trick, '♥')).toBe(1);
	});

	it('should return winner when one trump played', () => {
		const trick: Card[] = [
			card('♠', 'A'),
			card('♥', '7'), // Trump, even lowest trump beats non-trump
			card('♠', 'K'),
			card('♠', '10')
		];
		expect(determineTrickWinner(trick, '♥')).toBe(1);
	});

	it('should return winner when multiple trumps played - highest trump wins', () => {
		const trick: Card[] = [
			card('♠', 'A'),
			card('♥', 'K'),
			card('♥', '9'), // Higher trump (9 is second highest in trump)
			card('♥', '7')
		];
		expect(determineTrickWinner(trick, '♥')).toBe(2);
	});

	it('should recognize trump J as highest', () => {
		const trick: Card[] = [
			card('♥', '9'),
			card('♥', 'J'), // Highest trump
			card('♥', 'A'),
			card('♥', '10')
		];
		expect(determineTrickWinner(trick, '♥')).toBe(1);
	});

	it('should recognize trump 9 as second highest', () => {
		const trick: Card[] = [
			card('♥', 'A'),
			card('♥', '10'),
			card('♥', 'K'),
			card('♥', '9') // Second highest trump
		];
		expect(determineTrickWinner(trick, '♥')).toBe(3);
	});

	it('should ignore non-led non-trump cards', () => {
		const trick: Card[] = [
			card('♠', '7'), // Led suit
			card('♣', 'A'), // Different suit, not trump, doesn't count
			card('♦', 'A'), // Different suit, not trump, doesn't count
			card('♠', '10') // Led suit, highest of led suit
		];
		expect(determineTrickWinner(trick, '♥')).toBe(3);
	});

	it('should handle trump led', () => {
		const trick: Card[] = [
			card('♥', 'K'), // Trump led
			card('♥', 'Q'),
			card('♥', '8'),
			card('♥', 'A')
		];
		// A is third highest in trump (after J, 9)
		expect(determineTrickWinner(trick, '♥')).toBe(3);
	});
});

describe('checkAllMovesInRound', () => {
	type Seat = 0 | 1 | 2 | 3;
	type HandCards = Card[];

	const createMove = (player: Seat, cardPlayed: Card, trickNumber: number): PlayedMove => ({
		player,
		card: cardPlayed,
		trickNumber
	});

	it('should return empty array when no illegal moves', () => {
		// Seat 1 leads ♠10, everyone follows suit
		const handSnapshots: Record<number, Record<Seat, HandCards>> = {
			0: {
				0: [card('♠', '7'), card('♥', 'A')],
				1: [card('♠', '10'), card('♥', 'K')],
				2: [card('♠', 'K'), card('♥', 'Q')],
				3: [card('♠', 'A'), card('♥', 'J')]
			}
		};

		const playedMoves: PlayedMove[] = [
			createMove(1, card('♠', '10'), 0),
			createMove(2, card('♠', 'K'), 0),
			createMove(3, card('♠', 'A'), 0),
			createMove(0, card('♠', '7'), 0)
		];

		const illegals = checkAllMovesInRound(playedMoves, handSnapshots, '♥');
		expect(illegals).toEqual([]);
	});

	it('should detect illegal move - did not follow suit', () => {
		// Seat 1 leads ♠10, seat 0 has spades but plays hearts
		const handSnapshots: Record<number, Record<Seat, HandCards>> = {
			0: {
				0: [card('♠', '7'), card('♥', 'A')],
				1: [card('♠', '10'), card('♥', 'K')],
				2: [card('♠', 'K'), card('♥', 'Q')],
				3: [card('♠', 'A'), card('♥', 'J')]
			}
		};

		const playedMoves: PlayedMove[] = [
			createMove(1, card('♠', '10'), 0),
			createMove(2, card('♠', 'K'), 0),
			createMove(3, card('♠', 'A'), 0),
			createMove(0, card('♥', 'A'), 0) // Illegal! Has ♠7 but played ♥A
		];

		const illegals = checkAllMovesInRound(playedMoves, handSnapshots, '♥');
		expect(illegals).toHaveLength(1);
		expect(illegals[0].player).toBe(0);
		expect(illegals[0].trickNumber).toBe(0);
	});

	it('should detect multiple illegal moves in same round', () => {
		const handSnapshots: Record<number, Record<Seat, HandCards>> = {
			0: {
				0: [card('♠', '7'), card('♥', 'A')],
				1: [card('♠', '10'), card('♥', 'K')],
				2: [card('♠', 'K'), card('♥', 'Q')],
				3: [card('♠', 'A'), card('♥', 'J')]
			}
		};

		const playedMoves: PlayedMove[] = [
			createMove(1, card('♠', '10'), 0),
			createMove(2, card('♥', 'Q'), 0), // Illegal! Has ♠K
			createMove(3, card('♠', 'A'), 0),
			createMove(0, card('♥', 'A'), 0) // Illegal! Has ♠7
		];

		const illegals = checkAllMovesInRound(playedMoves, handSnapshots, '♥');
		expect(illegals).toHaveLength(2);
	});

	it('should detect illegal move in first trick', () => {
		const handSnapshots: Record<number, Record<Seat, HandCards>> = {
			0: {
				0: [card('♠', '7')],
				1: [card('♠', '10')],
				2: [card('♠', 'K')],
				3: [card('♠', 'A'), card('♥', 'J')]
			}
		};

		const playedMoves: PlayedMove[] = [
			createMove(1, card('♠', '10'), 0),
			createMove(2, card('♠', 'K'), 0),
			createMove(3, card('♥', 'J'), 0), // Illegal! Has ♠A
			createMove(0, card('♠', '7'), 0)
		];

		const illegals = checkAllMovesInRound(playedMoves, handSnapshots, '♥');
		expect(illegals).toHaveLength(1);
		expect(illegals[0].trickNumber).toBe(0);
	});

	it('should detect illegal move - did not trump when required', () => {
		const handSnapshots: Record<number, Record<Seat, HandCards>> = {
			0: {
				0: [card('♥', '7'), card('♣', 'A')], // Has trump ♥7
				1: [card('♠', '10')],
				2: [card('♠', 'K')],
				3: [card('♠', 'A')]
			}
		};

		const playedMoves: PlayedMove[] = [
			createMove(1, card('♠', '10'), 0),
			createMove(2, card('♠', 'K'), 0),
			createMove(3, card('♠', 'A'), 0),
			createMove(0, card('♣', 'A'), 0) // Illegal! Has trump but didn't play it
		];

		const illegals = checkAllMovesInRound(playedMoves, handSnapshots, '♥');
		expect(illegals).toHaveLength(1);
		expect(illegals[0].player).toBe(0);
	});
});
