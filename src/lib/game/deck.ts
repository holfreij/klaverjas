/**
 * Card and Deck types and utilities for Klaverjas.
 * Klaverjas uses a 32-card deck (7-A in 4 suits).
 */

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
	suit: Suit;
	rank: Rank;
}

/**
 * Card rankings for non-trump suits (index 0 = highest)
 */
const NON_TRUMP_RANK_ORDER: readonly Rank[] = ['A', '10', 'K', 'Q', 'J', '9', '8', '7'];

/**
 * Card rankings for trump suit (index 0 = highest)
 * J (Nel) and 9 (Nell) are highest in trump
 */
const TRUMP_RANK_ORDER: readonly Rank[] = ['J', '9', 'A', '10', 'K', 'Q', '8', '7'];

/**
 * Point values for non-trump cards
 */
const NON_TRUMP_POINTS: Record<Rank, number> = {
	A: 11,
	'10': 10,
	K: 4,
	Q: 3,
	J: 2,
	'9': 0,
	'8': 0,
	'7': 0,
};

/**
 * Point values for trump cards
 */
const TRUMP_POINTS: Record<Rank, number> = {
	J: 20, // Nel
	'9': 14, // Nell
	A: 11,
	'10': 10,
	K: 4,
	Q: 3,
	'8': 0,
	'7': 0,
};

/**
 * Creates a standard 32-card Klaverjas deck.
 */
export function createDeck(): Card[] {
	const deck: Card[] = [];
	for (const suit of SUITS) {
		for (const rank of RANKS) {
			deck.push({ suit, rank });
		}
	}
	return deck;
}

/**
 * Shuffles a deck using Fisher-Yates algorithm.
 * Returns a new array, does not modify the original.
 */
export function shuffle(deck: readonly Card[]): Card[] {
	const result = [...deck];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Deals 8 cards to each of 4 players.
 * @param deck A shuffled deck of 32 cards
 * @returns Array of 4 hands, each containing 8 cards
 * @throws Error if deck has fewer than 32 cards
 */
export function deal(deck: readonly Card[]): [Card[], Card[], Card[], Card[]] {
	if (deck.length < 32) {
		throw new Error(`Cannot deal: deck has ${deck.length} cards, needs 32`);
	}

	return [
		deck.slice(0, 8),
		deck.slice(8, 16),
		deck.slice(16, 24),
		deck.slice(24, 32),
	];
}

/**
 * Gets the point value of a card.
 * @param card The card to evaluate
 * @param trump The current trump suit
 */
export function getCardPoints(card: Card, trump: Suit): number {
	if (card.suit === trump) {
		return TRUMP_POINTS[card.rank];
	}
	return NON_TRUMP_POINTS[card.rank];
}

/**
 * Compares two cards to determine which is higher.
 * @param a First card
 * @param b Second card
 * @param trump The current trump suit
 * @param ledSuit The suit that was led in this trick
 * @returns Positive if a > b, negative if a < b, 0 if equal
 */
export function compareCards(a: Card, b: Card, trump: Suit, ledSuit: Suit): number {
	const aIsTrump = a.suit === trump;
	const bIsTrump = b.suit === trump;
	const aIsLed = a.suit === ledSuit;
	const bIsLed = b.suit === ledSuit;

	// Trump beats non-trump
	if (aIsTrump && !bIsTrump) return 1;
	if (!aIsTrump && bIsTrump) return -1;

	// Both trump: compare by trump ranking
	if (aIsTrump && bIsTrump) {
		return TRUMP_RANK_ORDER.indexOf(b.rank) - TRUMP_RANK_ORDER.indexOf(a.rank);
	}

	// Led suit beats non-led, non-trump
	if (aIsLed && !bIsLed) return 1;
	if (!aIsLed && bIsLed) return -1;

	// Same suit (both led or both not led): compare by non-trump ranking
	if (a.suit === b.suit) {
		return NON_TRUMP_RANK_ORDER.indexOf(b.rank) - NON_TRUMP_RANK_ORDER.indexOf(a.rank);
	}

	// Different non-trump, non-led suits: effectively equal (both lose)
	return 0;
}

/**
 * Returns a human-readable string representation of a card.
 */
export function cardToString(card: Card): string {
	return `${card.rank} of ${card.suit}`;
}
