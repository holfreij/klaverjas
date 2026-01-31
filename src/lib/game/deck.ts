export type Suit = '♠' | '♥' | '♣' | '♦';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
	suit: Suit;
	rank: Rank;
}

export type Hand = Card[];

export const SUITS: readonly Suit[] = ['♠', '♥', '♣', '♦'] as const;
export const RANKS: readonly Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

// Non-trump rank order for sorting (high to low): A-10-K-Q-J-9-8-7
const NON_TRUMP_RANK_ORDER: Record<Rank, number> = {
	A: 0,
	'10': 1,
	K: 2,
	Q: 3,
	J: 4,
	'9': 5,
	'8': 6,
	'7': 7
};

export function createDeck(): Card[] {
	const deck: Card[] = [];
	for (const suit of SUITS) {
		for (const rank of RANKS) {
			deck.push({ suit, rank });
		}
	}
	return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
	const shuffled = [...deck];
	// Fisher-Yates shuffle
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export function dealHands(deck: Card[]): [Hand, Hand, Hand, Hand] {
	const deckCopy = [...deck];
	return [deckCopy.slice(0, 8), deckCopy.slice(8, 16), deckCopy.slice(16, 24), deckCopy.slice(24, 32)];
}

export function sortHand(hand: Hand): Hand {
	const sorted = [...hand];
	sorted.sort((a, b) => {
		// First by suit order
		const suitDiff = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
		if (suitDiff !== 0) return suitDiff;
		// Then by non-trump rank order (high to low)
		return NON_TRUMP_RANK_ORDER[a.rank] - NON_TRUMP_RANK_ORDER[b.rank];
	});
	return sorted;
}
