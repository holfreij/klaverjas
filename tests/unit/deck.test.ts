import { describe, it, expect } from 'vitest';
import {
	type Card,
	SUITS,
	RANKS,
	createDeck,
	shuffleDeck,
	dealHands,
	sortHand
} from '$lib/game/deck';

describe('deck constants', () => {
	it('should have all 4 suits with correct symbols', () => {
		expect(SUITS).toEqual(['♠', '♥', '♣', '♦']);
	});

	it('should have all 8 ranks in order', () => {
		expect(RANKS).toEqual(['7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
	});
});

describe('createDeck', () => {
	it('should create a deck with exactly 32 cards', () => {
		const deck = createDeck();
		expect(deck).toHaveLength(32);
	});

	it('should have all 4 suits present', () => {
		const deck = createDeck();
		const suits = new Set(deck.map((card) => card.suit));
		expect(suits).toEqual(new Set(['♠', '♥', '♣', '♦']));
	});

	it('should have all 8 ranks present for each suit', () => {
		const deck = createDeck();
		for (const suit of SUITS) {
			const ranksInSuit = deck.filter((card) => card.suit === suit).map((card) => card.rank);
			expect(ranksInSuit.sort()).toEqual(['10', '7', '8', '9', 'A', 'J', 'K', 'Q']);
		}
	});

	it('should have no duplicate cards', () => {
		const deck = createDeck();
		const cardStrings = deck.map((card) => `${card.suit}${card.rank}`);
		const uniqueCards = new Set(cardStrings);
		expect(uniqueCards.size).toBe(32);
	});
});

describe('shuffleDeck', () => {
	it('should return a deck with the same 32 cards', () => {
		const deck = createDeck();
		const shuffled = shuffleDeck(deck);
		expect(shuffled).toHaveLength(32);

		const originalCards = new Set(deck.map((c) => `${c.suit}${c.rank}`));
		const shuffledCards = new Set(shuffled.map((c) => `${c.suit}${c.rank}`));
		expect(shuffledCards).toEqual(originalCards);
	});

	it('should not mutate the original deck', () => {
		const deck = createDeck();
		const originalFirst = deck[0];
		shuffleDeck(deck);
		expect(deck[0]).toBe(originalFirst);
	});

	it('should produce a different order (statistical test)', () => {
		const deck = createDeck();
		// Run multiple shuffles and check at least one differs
		let foundDifferent = false;
		for (let i = 0; i < 10; i++) {
			const shuffled = shuffleDeck(deck);
			const sameOrder = deck.every(
				(card, idx) => card.suit === shuffled[idx].suit && card.rank === shuffled[idx].rank
			);
			if (!sameOrder) {
				foundDifferent = true;
				break;
			}
		}
		expect(foundDifferent).toBe(true);
	});
});

describe('dealHands', () => {
	it('should deal exactly 8 cards to each of 4 players', () => {
		const deck = createDeck();
		const hands = dealHands(deck);
		expect(hands).toHaveLength(4);
		for (const hand of hands) {
			expect(hand).toHaveLength(8);
		}
	});

	it('should have no duplicate cards across all hands', () => {
		const deck = createDeck();
		const hands = dealHands(deck);
		const allCards = hands.flat();
		const cardStrings = allCards.map((card) => `${card.suit}${card.rank}`);
		const uniqueCards = new Set(cardStrings);
		expect(uniqueCards.size).toBe(32);
	});

	it('should not mutate the original deck', () => {
		const deck = createDeck();
		const originalFirst = deck[0];
		dealHands(deck);
		expect(deck[0]).toBe(originalFirst);
	});

	it('should use all cards from the deck', () => {
		const deck = createDeck();
		const hands = dealHands(deck);
		const allDealtCards = new Set(hands.flat().map((c) => `${c.suit}${c.rank}`));
		const originalCards = new Set(deck.map((c) => `${c.suit}${c.rank}`));
		expect(allDealtCards).toEqual(originalCards);
	});
});

describe('sortHand', () => {
	it('should sort by suit order: ♠, ♥, ♣, ♦', () => {
		const hand: Card[] = [
			{ suit: '♦', rank: 'A' },
			{ suit: '♠', rank: '7' },
			{ suit: '♣', rank: 'K' },
			{ suit: '♥', rank: '10' }
		];
		const sorted = sortHand(hand);
		expect(sorted.map((c) => c.suit)).toEqual(['♠', '♥', '♣', '♦']);
	});

	it('should sort within suit by non-trump rank order: A-10-K-Q-J-9-8-7', () => {
		const hand: Card[] = [
			{ suit: '♠', rank: '7' },
			{ suit: '♠', rank: 'A' },
			{ suit: '♠', rank: 'J' },
			{ suit: '♠', rank: '10' },
			{ suit: '♠', rank: 'Q' },
			{ suit: '♠', rank: 'K' },
			{ suit: '♠', rank: '9' },
			{ suit: '♠', rank: '8' }
		];
		const sorted = sortHand(hand);
		expect(sorted.map((c) => c.rank)).toEqual(['A', '10', 'K', 'Q', 'J', '9', '8', '7']);
	});

	it('should not mutate the original hand', () => {
		const hand: Card[] = [
			{ suit: '♦', rank: 'A' },
			{ suit: '♠', rank: '7' }
		];
		const originalFirst = hand[0];
		sortHand(hand);
		expect(hand[0]).toBe(originalFirst);
	});

	it('should handle a full 8-card hand with mixed suits', () => {
		const hand: Card[] = [
			{ suit: '♦', rank: '7' },
			{ suit: '♠', rank: 'K' },
			{ suit: '♥', rank: 'A' },
			{ suit: '♣', rank: '9' },
			{ suit: '♠', rank: 'A' },
			{ suit: '♦', rank: 'Q' },
			{ suit: '♥', rank: '10' },
			{ suit: '♣', rank: 'J' }
		];
		const sorted = sortHand(hand);
		// Should be: ♠A, ♠K, ♥A, ♥10, ♣J, ♣9, ♦Q, ♦7
		expect(sorted).toEqual([
			{ suit: '♠', rank: 'A' },
			{ suit: '♠', rank: 'K' },
			{ suit: '♥', rank: 'A' },
			{ suit: '♥', rank: '10' },
			{ suit: '♣', rank: 'J' },
			{ suit: '♣', rank: '9' },
			{ suit: '♦', rank: 'Q' },
			{ suit: '♦', rank: '7' }
		]);
	});

	it('should handle an empty hand', () => {
		const sorted = sortHand([]);
		expect(sorted).toEqual([]);
	});
});
