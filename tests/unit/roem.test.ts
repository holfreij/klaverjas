import { describe, it, expect } from 'vitest';
import type { Card, Suit } from '$lib/game/deck';
import {
	detectSequences,
	detectStuk,
	detectFourOfAKind,
	detectAllRoem,
	validateRoemClaim,
	type RoemType,
	type RoemClaim,
} from '$lib/game/roem';

describe('roem', () => {
	const trump: Suit = 'Harten';

	describe('detectSequences', () => {
		it('should detect a three-card sequence', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: '7' },
				{ suit: 'Schoppen', rank: '8' },
				{ suit: 'Schoppen', rank: '9' },
			];

			const sequences = detectSequences(cards);

			expect(sequences).toHaveLength(1);
			expect(sequences[0].type).toBe('sequence3');
			expect(sequences[0].points).toBe(20);
		});

		it('should detect a four-card sequence', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: '10' },
				{ suit: 'Schoppen', rank: 'J' },
				{ suit: 'Schoppen', rank: 'Q' },
				{ suit: 'Schoppen', rank: 'K' },
			];

			const sequences = detectSequences(cards);

			expect(sequences).toHaveLength(1);
			expect(sequences[0].type).toBe('sequence4');
			expect(sequences[0].points).toBe(50);
		});

		it('should not detect sequence across different suits', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: '7' },
				{ suit: 'Harten', rank: '8' },
				{ suit: 'Schoppen', rank: '9' },
			];

			const sequences = detectSequences(cards);

			expect(sequences).toHaveLength(0);
		});

		it('should detect multiple sequences in different suits', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: '7' },
				{ suit: 'Schoppen', rank: '8' },
				{ suit: 'Schoppen', rank: '9' },
				{ suit: 'Harten', rank: 'Q' },
				{ suit: 'Harten', rank: 'K' },
				{ suit: 'Harten', rank: 'A' },
			];

			const sequences = detectSequences(cards);

			expect(sequences).toHaveLength(2);
			expect(sequences.every((s) => s.type === 'sequence3')).toBe(true);
		});

		it('should detect longer sequence (5+ cards) as one sequence with highest value', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: '7' },
				{ suit: 'Schoppen', rank: '8' },
				{ suit: 'Schoppen', rank: '9' },
				{ suit: 'Schoppen', rank: '10' },
				{ suit: 'Schoppen', rank: 'J' },
			];

			const sequences = detectSequences(cards);

			// A 5-card sequence should be detected as a 4-card sequence (highest value)
			// The remaining card doesn't form another sequence
			expect(sequences).toHaveLength(1);
			expect(sequences[0].type).toBe('sequence4');
			expect(sequences[0].points).toBe(50);
		});

		it('should not count partial sequences', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: '7' },
				{ suit: 'Schoppen', rank: '8' },
			];

			const sequences = detectSequences(cards);

			expect(sequences).toHaveLength(0);
		});
	});

	describe('detectStuk', () => {
		it('should detect stuk (K and Q of trump)', () => {
			const cards: Card[] = [
				{ suit: 'Harten', rank: 'K' },
				{ suit: 'Harten', rank: 'Q' },
			];

			const stuk = detectStuk(cards, trump);

			expect(stuk).not.toBeNull();
			expect(stuk?.type).toBe('stuk');
			expect(stuk?.points).toBe(20);
		});

		it('should not detect stuk in non-trump suit', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: 'K' },
				{ suit: 'Schoppen', rank: 'Q' },
			];

			const stuk = detectStuk(cards, trump);

			expect(stuk).toBeNull();
		});

		it('should not detect stuk with only K of trump', () => {
			const cards: Card[] = [
				{ suit: 'Harten', rank: 'K' },
				{ suit: 'Schoppen', rank: 'Q' },
			];

			const stuk = detectStuk(cards, trump);

			expect(stuk).toBeNull();
		});

		it('should not detect stuk with only Q of trump', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: 'K' },
				{ suit: 'Harten', rank: 'Q' },
			];

			const stuk = detectStuk(cards, trump);

			expect(stuk).toBeNull();
		});
	});

	describe('detectFourOfAKind', () => {
		it('should detect four jacks', () => {
			const cards: Card[] = [
				{ suit: 'Harten', rank: 'J' },
				{ suit: 'Ruiten', rank: 'J' },
				{ suit: 'Klaver', rank: 'J' },
				{ suit: 'Schoppen', rank: 'J' },
			];

			const fourOfAKind = detectFourOfAKind(cards);

			expect(fourOfAKind).toHaveLength(1);
			expect(fourOfAKind[0].type).toBe('fourOfAKind');
			expect(fourOfAKind[0].points).toBe(100);
		});

		it('should detect four aces', () => {
			const cards: Card[] = [
				{ suit: 'Harten', rank: 'A' },
				{ suit: 'Ruiten', rank: 'A' },
				{ suit: 'Klaver', rank: 'A' },
				{ suit: 'Schoppen', rank: 'A' },
			];

			const fourOfAKind = detectFourOfAKind(cards);

			expect(fourOfAKind).toHaveLength(1);
			expect(fourOfAKind[0].type).toBe('fourOfAKind');
			expect(fourOfAKind[0].points).toBe(100);
		});

		it('should not detect three of a kind', () => {
			const cards: Card[] = [
				{ suit: 'Harten', rank: 'J' },
				{ suit: 'Ruiten', rank: 'J' },
				{ suit: 'Klaver', rank: 'J' },
			];

			const fourOfAKind = detectFourOfAKind(cards);

			expect(fourOfAKind).toHaveLength(0);
		});

		it('should not count four 7s or 8s (no point value)', () => {
			const cards7: Card[] = [
				{ suit: 'Harten', rank: '7' },
				{ suit: 'Ruiten', rank: '7' },
				{ suit: 'Klaver', rank: '7' },
				{ suit: 'Schoppen', rank: '7' },
			];

			const cards8: Card[] = [
				{ suit: 'Harten', rank: '8' },
				{ suit: 'Ruiten', rank: '8' },
				{ suit: 'Klaver', rank: '8' },
				{ suit: 'Schoppen', rank: '8' },
			];

			expect(detectFourOfAKind(cards7)).toHaveLength(0);
			expect(detectFourOfAKind(cards8)).toHaveLength(0);
		});
	});

	describe('detectAllRoem', () => {
		it('should detect stacked roem: sequence + stuk', () => {
			// Q-K-A of trump = 20 (sequence) + 20 (stuk) = 40
			const cards: Card[] = [
				{ suit: 'Harten', rank: 'Q' },
				{ suit: 'Harten', rank: 'K' },
				{ suit: 'Harten', rank: 'A' },
			];

			const roem = detectAllRoem(cards, trump);

			expect(roem.totalPoints).toBe(40);
			expect(roem.claims).toHaveLength(2);
		});

		it('should detect four of a kind + sequences in same cards', () => {
			// If somehow the 4 cards form both (e.g., 4 jacks can't be a sequence)
			// Just testing detection works for multiple types
			const cards: Card[] = [
				{ suit: 'Harten', rank: 'J' },
				{ suit: 'Ruiten', rank: 'J' },
				{ suit: 'Klaver', rank: 'J' },
				{ suit: 'Schoppen', rank: 'J' },
				{ suit: 'Schoppen', rank: 'Q' },
				{ suit: 'Schoppen', rank: 'K' },
			];

			const roem = detectAllRoem(cards, trump);

			// Should have four of a kind (100) + sequence (20)
			expect(roem.claims).toContainEqual(expect.objectContaining({ type: 'fourOfAKind' }));
			expect(roem.claims).toContainEqual(expect.objectContaining({ type: 'sequence3' }));
		});

		it('should return empty for cards with no roem', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: '7' },
				{ suit: 'Harten', rank: 'A' },
				{ suit: 'Ruiten', rank: '10' },
				{ suit: 'Klaver', rank: 'K' },
			];

			const roem = detectAllRoem(cards, trump);

			expect(roem.totalPoints).toBe(0);
			expect(roem.claims).toHaveLength(0);
		});
	});

	describe('validateRoemClaim', () => {
		it('should validate a correct sequence claim', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: '7' },
				{ suit: 'Schoppen', rank: '8' },
				{ suit: 'Schoppen', rank: '9' },
				{ suit: 'Harten', rank: 'A' },
			];

			const claim: RoemClaim = {
				type: 'sequence3',
				cards: [
					{ suit: 'Schoppen', rank: '7' },
					{ suit: 'Schoppen', rank: '8' },
					{ suit: 'Schoppen', rank: '9' },
				],
			};

			expect(validateRoemClaim(claim, cards, trump)).toBe(true);
		});

		it('should reject an invalid sequence claim', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: '7' },
				{ suit: 'Schoppen', rank: '8' },
				{ suit: 'Schoppen', rank: '10' }, // Gap!
			];

			const claim: RoemClaim = {
				type: 'sequence3',
				cards: [
					{ suit: 'Schoppen', rank: '7' },
					{ suit: 'Schoppen', rank: '8' },
					{ suit: 'Schoppen', rank: '10' },
				],
			};

			expect(validateRoemClaim(claim, cards, trump)).toBe(false);
		});

		it('should reject claim with cards not in hand', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: '7' },
				{ suit: 'Schoppen', rank: '8' },
			];

			const claim: RoemClaim = {
				type: 'sequence3',
				cards: [
					{ suit: 'Schoppen', rank: '7' },
					{ suit: 'Schoppen', rank: '8' },
					{ suit: 'Schoppen', rank: '9' }, // Not in hand
				],
			};

			expect(validateRoemClaim(claim, cards, trump)).toBe(false);
		});

		it('should validate a correct stuk claim', () => {
			const cards: Card[] = [
				{ suit: 'Harten', rank: 'K' },
				{ suit: 'Harten', rank: 'Q' },
				{ suit: 'Schoppen', rank: 'A' },
			];

			const claim: RoemClaim = {
				type: 'stuk',
				cards: [
					{ suit: 'Harten', rank: 'K' },
					{ suit: 'Harten', rank: 'Q' },
				],
			};

			expect(validateRoemClaim(claim, cards, trump)).toBe(true);
		});

		it('should reject stuk claim in non-trump suit', () => {
			const cards: Card[] = [
				{ suit: 'Schoppen', rank: 'K' },
				{ suit: 'Schoppen', rank: 'Q' },
			];

			const claim: RoemClaim = {
				type: 'stuk',
				cards: [
					{ suit: 'Schoppen', rank: 'K' },
					{ suit: 'Schoppen', rank: 'Q' },
				],
			};

			expect(validateRoemClaim(claim, cards, trump)).toBe(false);
		});
	});
});
