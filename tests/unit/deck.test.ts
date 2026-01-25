import { describe, it, expect } from 'vitest';
import {
	type Card,
	type Suit,
	type Rank,
	SUITS,
	RANKS,
	createDeck,
	shuffle,
	deal,
	getCardPoints,
	compareCards,
	cardToString,
} from '$lib/game/deck';

describe('deck', () => {
	describe('constants', () => {
		it('should have 4 suits', () => {
			expect(SUITS).toHaveLength(4);
			expect(SUITS).toContain('Harten');
			expect(SUITS).toContain('Ruiten');
			expect(SUITS).toContain('Klaver');
			expect(SUITS).toContain('Schoppen');
		});

		it('should have 8 ranks (7-A)', () => {
			expect(RANKS).toHaveLength(8);
			expect(RANKS).toContain('7');
			expect(RANKS).toContain('8');
			expect(RANKS).toContain('9');
			expect(RANKS).toContain('10');
			expect(RANKS).toContain('J');
			expect(RANKS).toContain('Q');
			expect(RANKS).toContain('K');
			expect(RANKS).toContain('A');
		});
	});

	describe('createDeck', () => {
		it('should create a deck of 32 cards', () => {
			const deck = createDeck();
			expect(deck).toHaveLength(32);
		});

		it('should have 8 cards per suit', () => {
			const deck = createDeck();
			for (const suit of SUITS) {
				const cardsOfSuit = deck.filter((card) => card.suit === suit);
				expect(cardsOfSuit).toHaveLength(8);
			}
		});

		it('should have 4 cards per rank', () => {
			const deck = createDeck();
			for (const rank of RANKS) {
				const cardsOfRank = deck.filter((card) => card.rank === rank);
				expect(cardsOfRank).toHaveLength(4);
			}
		});

		it('should have all unique cards', () => {
			const deck = createDeck();
			const cardStrings = deck.map((card) => `${card.rank}-${card.suit}`);
			const uniqueCards = new Set(cardStrings);
			expect(uniqueCards.size).toBe(32);
		});
	});

	describe('shuffle', () => {
		it('should return a deck of 32 cards', () => {
			const deck = createDeck();
			const shuffled = shuffle(deck);
			expect(shuffled).toHaveLength(32);
		});

		it('should contain all original cards', () => {
			const deck = createDeck();
			const shuffled = shuffle(deck);

			const deckStrings = deck.map((c) => `${c.rank}-${c.suit}`).sort();
			const shuffledStrings = shuffled.map((c) => `${c.rank}-${c.suit}`).sort();
			expect(shuffledStrings).toEqual(deckStrings);
		});

		it('should not modify the original deck', () => {
			const deck = createDeck();
			const originalFirst = deck[0];
			shuffle(deck);
			expect(deck[0]).toBe(originalFirst);
		});

		it('should produce different orderings (statistical test)', () => {
			const deck = createDeck();
			const orderings = new Set<string>();

			// Shuffle 10 times, expect at least 9 unique orderings
			for (let i = 0; i < 10; i++) {
				const shuffled = shuffle(deck);
				orderings.add(shuffled.map((c) => `${c.rank}-${c.suit}`).join(','));
			}

			expect(orderings.size).toBeGreaterThanOrEqual(9);
		});
	});

	describe('deal', () => {
		it('should deal 8 cards to each of 4 players', () => {
			const deck = createDeck();
			const hands = deal(shuffle(deck));

			expect(hands).toHaveLength(4);
			for (const hand of hands) {
				expect(hand).toHaveLength(8);
			}
		});

		it('should distribute all 32 cards with no duplicates', () => {
			const deck = createDeck();
			const hands = deal(shuffle(deck));

			const allCards = hands.flat();
			expect(allCards).toHaveLength(32);

			const cardStrings = allCards.map((c) => `${c.rank}-${c.suit}`);
			const uniqueCards = new Set(cardStrings);
			expect(uniqueCards.size).toBe(32);
		});

		it('should throw if deck has fewer than 32 cards', () => {
			const partialDeck = createDeck().slice(0, 20);
			expect(() => deal(partialDeck)).toThrow();
		});
	});

	describe('getCardPoints', () => {
		describe('non-trump', () => {
			const trump: Suit = 'Harten';

			it('should return 11 for Ace', () => {
				expect(getCardPoints({ suit: 'Schoppen', rank: 'A' }, trump)).toBe(11);
			});

			it('should return 10 for 10', () => {
				expect(getCardPoints({ suit: 'Schoppen', rank: '10' }, trump)).toBe(10);
			});

			it('should return 4 for King', () => {
				expect(getCardPoints({ suit: 'Schoppen', rank: 'K' }, trump)).toBe(4);
			});

			it('should return 3 for Queen', () => {
				expect(getCardPoints({ suit: 'Schoppen', rank: 'Q' }, trump)).toBe(3);
			});

			it('should return 2 for Jack', () => {
				expect(getCardPoints({ suit: 'Schoppen', rank: 'J' }, trump)).toBe(2);
			});

			it('should return 0 for 9, 8, 7', () => {
				expect(getCardPoints({ suit: 'Schoppen', rank: '9' }, trump)).toBe(0);
				expect(getCardPoints({ suit: 'Schoppen', rank: '8' }, trump)).toBe(0);
				expect(getCardPoints({ suit: 'Schoppen', rank: '7' }, trump)).toBe(0);
			});
		});

		describe('trump', () => {
			const trump: Suit = 'Harten';

			it('should return 20 for Jack of trump (Nel)', () => {
				expect(getCardPoints({ suit: 'Harten', rank: 'J' }, trump)).toBe(20);
			});

			it('should return 14 for 9 of trump (Nell)', () => {
				expect(getCardPoints({ suit: 'Harten', rank: '9' }, trump)).toBe(14);
			});

			it('should return 11 for Ace of trump', () => {
				expect(getCardPoints({ suit: 'Harten', rank: 'A' }, trump)).toBe(11);
			});

			it('should return 10 for 10 of trump', () => {
				expect(getCardPoints({ suit: 'Harten', rank: '10' }, trump)).toBe(10);
			});

			it('should return 4 for King of trump', () => {
				expect(getCardPoints({ suit: 'Harten', rank: 'K' }, trump)).toBe(4);
			});

			it('should return 3 for Queen of trump', () => {
				expect(getCardPoints({ suit: 'Harten', rank: 'Q' }, trump)).toBe(3);
			});

			it('should return 0 for 8 and 7 of trump', () => {
				expect(getCardPoints({ suit: 'Harten', rank: '8' }, trump)).toBe(0);
				expect(getCardPoints({ suit: 'Harten', rank: '7' }, trump)).toBe(0);
			});
		});

		describe('total points', () => {
			it('should sum to 152 for all cards (without last trick bonus)', () => {
				const deck = createDeck();
				const trump: Suit = 'Harten';
				const total = deck.reduce((sum, card) => sum + getCardPoints(card, trump), 0);
				expect(total).toBe(152);
			});
		});
	});

	describe('compareCards', () => {
		const trump: Suit = 'Harten';

		describe('same non-trump suit', () => {
			it('should rank Ace highest', () => {
				const ace: Card = { suit: 'Schoppen', rank: 'A' };
				const ten: Card = { suit: 'Schoppen', rank: '10' };
				expect(compareCards(ace, ten, trump, 'Schoppen')).toBeGreaterThan(0);
			});

			it('should rank 10 above King', () => {
				const ten: Card = { suit: 'Schoppen', rank: '10' };
				const king: Card = { suit: 'Schoppen', rank: 'K' };
				expect(compareCards(ten, king, trump, 'Schoppen')).toBeGreaterThan(0);
			});

			it('should rank 7 lowest', () => {
				const seven: Card = { suit: 'Schoppen', rank: '7' };
				const eight: Card = { suit: 'Schoppen', rank: '8' };
				expect(compareCards(seven, eight, trump, 'Schoppen')).toBeLessThan(0);
			});
		});

		describe('trump suit', () => {
			it('should rank Jack (Nel) highest', () => {
				const jack: Card = { suit: 'Harten', rank: 'J' };
				const nine: Card = { suit: 'Harten', rank: '9' };
				expect(compareCards(jack, nine, trump, 'Harten')).toBeGreaterThan(0);
			});

			it('should rank 9 (Nell) second highest', () => {
				const nine: Card = { suit: 'Harten', rank: '9' };
				const ace: Card = { suit: 'Harten', rank: 'A' };
				expect(compareCards(nine, ace, trump, 'Harten')).toBeGreaterThan(0);
			});

			it('should rank trump over non-trump', () => {
				const trumpSeven: Card = { suit: 'Harten', rank: '7' };
				const nonTrumpAce: Card = { suit: 'Schoppen', rank: 'A' };
				expect(compareCards(trumpSeven, nonTrumpAce, trump, 'Schoppen')).toBeGreaterThan(0);
			});
		});

		describe('different non-trump suits', () => {
			it('should rank led suit over non-led suit', () => {
				const ledSuit: Card = { suit: 'Schoppen', rank: '7' };
				const otherSuit: Card = { suit: 'Klaver', rank: 'A' };
				expect(compareCards(ledSuit, otherSuit, trump, 'Schoppen')).toBeGreaterThan(0);
			});
		});
	});

	describe('cardToString', () => {
		it('should format card as "suit rank"', () => {
			expect(cardToString({ suit: 'Harten', rank: 'A' })).toBe('Harten A');
			expect(cardToString({ suit: 'Schoppen', rank: '10' })).toBe('Schoppen 10');
		});
	});
});
