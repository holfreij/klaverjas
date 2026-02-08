import { describe, it, expect } from 'vitest';
import type { Card, Suit } from '$lib/game/deck';
import { detectRoem, validateRoemClaim, getRoemPoints } from '$lib/game/roem';

const card = (suit: Suit, rank: Card['rank']): Card => ({ suit, rank });

describe('detectRoem', () => {
	describe('sequences', () => {
		it('should detect a sequence of 3 same suit (20 points)', () => {
			const trick = [card('♠', '7'), card('♠', '8'), card('♠', '9'), card('♥', 'A')];
			const roem = detectRoem(trick, '♥');
			expect(roem).toContainEqual({ type: 'sequence', points: 20, cards: expect.any(Array) });
		});

		it('should detect a sequence of 4 same suit (50 points)', () => {
			const trick = [card('♠', '7'), card('♠', '8'), card('♠', '9'), card('♠', '10')];
			const roem = detectRoem(trick, '♥');
			expect(roem).toContainEqual({ type: 'sequence', points: 50, cards: expect.any(Array) });
		});

		it('should not count 4-sequence as two 3-sequences', () => {
			const trick = [card('♠', '7'), card('♠', '8'), card('♠', '9'), card('♠', '10')];
			const roem = detectRoem(trick, '♥');
			// Should have only one roem entry for 50 points
			expect(roem.filter((r) => r.type === 'sequence')).toHaveLength(1);
			expect(roem[0].points).toBe(50);
		});

		it('should use correct sequence order: 7-8-9-10-J-Q-K-A', () => {
			const trick = [card('♠', 'Q'), card('♠', 'K'), card('♠', 'A'), card('♥', '7')];
			const roem = detectRoem(trick, '♥');
			expect(roem).toContainEqual({ type: 'sequence', points: 20, cards: expect.any(Array) });
		});

		it('should not detect non-consecutive cards as sequence', () => {
			const trick = [card('♠', '7'), card('♠', '9'), card('♠', 'J'), card('♠', 'K')];
			const roem = detectRoem(trick, '♥');
			expect(roem.filter((r) => r.type === 'sequence')).toHaveLength(0);
		});

		it('should not detect sequence across different suits', () => {
			const trick = [card('♠', '7'), card('♥', '8'), card('♠', '9'), card('♠', '10')];
			const roem = detectRoem(trick, '♣');
			expect(roem.filter((r) => r.type === 'sequence')).toHaveLength(0);
		});

		it('should detect 3-sequence within 4 same-suit non-consecutive cards', () => {
			// 7♠ 10♠ J♠ Q♠ — 10-J-Q is a valid 3-sequence (20 pts)
			const trick = [card('♠', '7'), card('♠', '10'), card('♠', 'J'), card('♠', 'Q')];
			const roem = detectRoem(trick, '♥');
			expect(roem).toContainEqual({ type: 'sequence', points: 20, cards: expect.any(Array) });
		});

		it('should detect 3-sequence at start of 4 same-suit cards', () => {
			// 7♠ 8♠ 9♠ Q♠ — 7-8-9 is a valid 3-sequence (20 pts)
			const trick = [card('♠', '7'), card('♠', '8'), card('♠', '9'), card('♠', 'Q')];
			const roem = detectRoem(trick, '♥');
			expect(roem).toContainEqual({ type: 'sequence', points: 20, cards: expect.any(Array) });
		});

		it('should detect sequence regardless of play order', () => {
			// 9♠ 7♠ 8♠ A♥ — 7-8-9 is a valid 3-sequence despite unsorted play order
			const trick = [card('♠', '9'), card('♠', '7'), card('♠', '8'), card('♥', 'A')];
			const roem = detectRoem(trick, '♥');
			expect(roem).toContainEqual({ type: 'sequence', points: 20, cards: expect.any(Array) });
		});

		it('should return correct cards for 3-sequence in 4 same-suit', () => {
			// 7♠ 10♠ J♠ Q♠ — only 10-J-Q should be in the cards array
			const trick = [card('♠', '7'), card('♠', '10'), card('♠', 'J'), card('♠', 'Q')];
			const roem = detectRoem(trick, '♥');
			const seq = roem.find((r) => r.type === 'sequence');
			expect(seq).toBeDefined();
			expect(seq!.cards).toHaveLength(3);
			expect(seq!.cards.map((c) => c.rank).sort()).toEqual(['10', 'J', 'Q'].sort());
		});
	});

	describe('stuk (K+Q of trump)', () => {
		it('should detect stuk when K and Q of trump are in trick (20 points)', () => {
			const trick = [card('♠', 'K'), card('♠', 'Q'), card('♥', 'A'), card('♣', '7')];
			const roem = detectRoem(trick, '♠');
			expect(roem).toContainEqual({ type: 'stuk', points: 20, cards: expect.any(Array) });
		});

		it('should not detect stuk for non-trump K+Q', () => {
			const trick = [card('♠', 'K'), card('♠', 'Q'), card('♥', 'A'), card('♣', '7')];
			const roem = detectRoem(trick, '♥'); // Hearts is trump, not spades
			expect(roem.filter((r) => r.type === 'stuk')).toHaveLength(0);
		});

		it('should not detect stuk with only K of trump', () => {
			const trick = [card('♠', 'K'), card('♥', 'Q'), card('♥', 'A'), card('♣', '7')];
			const roem = detectRoem(trick, '♠');
			expect(roem.filter((r) => r.type === 'stuk')).toHaveLength(0);
		});
	});

	describe('four of a kind (100 points)', () => {
		it('should detect four of a kind', () => {
			const trick = [card('♠', 'K'), card('♥', 'K'), card('♣', 'K'), card('♦', 'K')];
			const roem = detectRoem(trick, '♠');
			expect(roem).toContainEqual({ type: 'fourOfAKind', points: 100, cards: expect.any(Array) });
		});

		it('should not give extra points for four of a kind with trump K', () => {
			const trick = [card('♠', 'K'), card('♥', 'K'), card('♣', 'K'), card('♦', 'K')];
			const roem = detectRoem(trick, '♠');
			// Should only have fourOfAKind (100), no separate stuk
			const totalPoints = roem.reduce((sum, r) => sum + r.points, 0);
			expect(totalPoints).toBe(100);
		});
	});

	describe('combined roem', () => {
		it('should detect K-Q-J of trump as sequence (20) + stuk (20) = 40', () => {
			const trick = [card('♠', 'K'), card('♠', 'Q'), card('♠', 'J'), card('♥', '7')];
			const roem = detectRoem(trick, '♠');
			expect(roem).toContainEqual({ type: 'sequence', points: 20, cards: expect.any(Array) });
			expect(roem).toContainEqual({ type: 'stuk', points: 20, cards: expect.any(Array) });
			const totalPoints = roem.reduce((sum, r) => sum + r.points, 0);
			expect(totalPoints).toBe(40);
		});

		it('should detect A-K-Q-J of trump as sequence (50) + stuk (20) = 70', () => {
			const trick = [card('♠', 'A'), card('♠', 'K'), card('♠', 'Q'), card('♠', 'J')];
			const roem = detectRoem(trick, '♠');
			expect(roem).toContainEqual({ type: 'sequence', points: 50, cards: expect.any(Array) });
			expect(roem).toContainEqual({ type: 'stuk', points: 20, cards: expect.any(Array) });
			const totalPoints = roem.reduce((sum, r) => sum + r.points, 0);
			expect(totalPoints).toBe(70);
		});

		it('should detect stuk alongside non-trump sequence', () => {
			// Hearts is trump. ♥K, ♥Q (stuk) plus ♠7-8-9 would need 5 cards...
			// In 4 cards: ♠7, ♠8, ♥K, ♥Q - no sequence possible
			const trick = [card('♥', 'K'), card('♥', 'Q'), card('♠', '7'), card('♣', 'A')];
			const roem = detectRoem(trick, '♥');
			expect(roem).toContainEqual({ type: 'stuk', points: 20, cards: expect.any(Array) });
			expect(roem.filter((r) => r.type === 'sequence')).toHaveLength(0);
		});
	});

	describe('no roem', () => {
		it('should return empty array when no roem', () => {
			const trick = [card('♠', '7'), card('♥', '10'), card('♣', 'A'), card('♦', 'K')];
			const roem = detectRoem(trick, '♠');
			expect(roem).toEqual([]);
		});
	});
});

describe('getRoemPoints', () => {
	it('should sum all roem points in trick', () => {
		const trick = [card('♠', 'K'), card('♠', 'Q'), card('♠', 'J'), card('♥', '7')];
		// K-Q-J sequence (20) + stuk (20) = 40
		expect(getRoemPoints(trick, '♠')).toBe(40);
	});

	it('should return 0 when no roem', () => {
		const trick = [card('♠', '7'), card('♥', '10'), card('♣', 'A'), card('♦', 'K')];
		expect(getRoemPoints(trick, '♠')).toBe(0);
	});

	it('should return 50 for 4-sequence', () => {
		const trick = [card('♠', '7'), card('♠', '8'), card('♠', '9'), card('♠', '10')];
		expect(getRoemPoints(trick, '♥')).toBe(50);
	});

	it('should return 100 for four of a kind', () => {
		const trick = [card('♠', 'A'), card('♥', 'A'), card('♣', 'A'), card('♦', 'A')];
		expect(getRoemPoints(trick, '♠')).toBe(100);
	});
});

describe('validateRoemClaim', () => {
	it('should accept claim of 20 for 3-sequence', () => {
		const trick = [card('♠', '7'), card('♠', '8'), card('♠', '9'), card('♥', 'A')];
		expect(validateRoemClaim(trick, '♥', 20)).toBe(true);
	});

	it('should accept claim of 20 for stuk', () => {
		const trick = [card('♠', 'K'), card('♠', 'Q'), card('♥', 'A'), card('♣', '7')];
		expect(validateRoemClaim(trick, '♠', 20)).toBe(true);
	});

	it('should accept claim of 40 for K-Q-J trump', () => {
		const trick = [card('♠', 'K'), card('♠', 'Q'), card('♠', 'J'), card('♥', '7')];
		expect(validateRoemClaim(trick, '♠', 40)).toBe(true);
	});

	it('should accept claim of 50 for 4-sequence', () => {
		const trick = [card('♠', '7'), card('♠', '8'), card('♠', '9'), card('♠', '10')];
		expect(validateRoemClaim(trick, '♥', 50)).toBe(true);
	});

	it('should accept claim of 70 for A-K-Q-J trump', () => {
		const trick = [card('♠', 'A'), card('♠', 'K'), card('♠', 'Q'), card('♠', 'J')];
		expect(validateRoemClaim(trick, '♠', 70)).toBe(true);
	});

	it('should accept claim of 100 for four of a kind', () => {
		const trick = [card('♠', 'K'), card('♥', 'K'), card('♣', 'K'), card('♦', 'K')];
		expect(validateRoemClaim(trick, '♠', 100)).toBe(true);
	});

	it('should reject overclaim', () => {
		const trick = [card('♠', '7'), card('♠', '8'), card('♠', '9'), card('♥', 'A')];
		// Only 20 points available, claiming 40
		expect(validateRoemClaim(trick, '♥', 40)).toBe(false);
	});

	it('should reject underclaim', () => {
		const trick = [card('♠', 'K'), card('♠', 'Q'), card('♠', 'J'), card('♥', '7')];
		// 40 points available, claiming 20
		expect(validateRoemClaim(trick, '♠', 20)).toBe(false);
	});

	it('should reject claim when no roem', () => {
		const trick = [card('♠', '7'), card('♥', '10'), card('♣', 'A'), card('♦', 'K')];
		expect(validateRoemClaim(trick, '♠', 20)).toBe(false);
	});
});
