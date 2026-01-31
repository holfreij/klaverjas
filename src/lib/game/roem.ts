import type { Card, Suit, Rank } from './deck';

// Sequence order: 7-8-9-10-J-Q-K-A
const SEQUENCE_ORDER: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export interface RoemItem {
	type: 'sequence' | 'stuk' | 'fourOfAKind';
	points: number;
	cards: Card[];
}

export function detectRoem(trick: Card[], trumpSuit: Suit): RoemItem[] {
	const roem: RoemItem[] = [];

	// Check for four of a kind first (100 points)
	const fourOfAKind = detectFourOfAKind(trick);
	if (fourOfAKind) {
		roem.push(fourOfAKind);
		// Four of a kind doesn't combine with stuk, return early
		return roem;
	}

	// Check for sequences (group by suit)
	const sequence = detectSequence(trick);
	if (sequence) {
		roem.push(sequence);
	}

	// Check for stuk (K+Q of trump)
	const stuk = detectStuk(trick, trumpSuit);
	if (stuk) {
		roem.push(stuk);
	}

	return roem;
}

function detectFourOfAKind(trick: Card[]): RoemItem | null {
	if (trick.length !== 4) return null;

	const rank = trick[0].rank;
	if (trick.every((c) => c.rank === rank)) {
		return { type: 'fourOfAKind', points: 100, cards: [...trick] };
	}
	return null;
}

function detectSequence(trick: Card[]): RoemItem | null {
	// Group cards by suit
	const bySuit = new Map<Suit, Card[]>();
	for (const card of trick) {
		const cards = bySuit.get(card.suit) || [];
		cards.push(card);
		bySuit.set(card.suit, cards);
	}

	// Check each suit for sequences
	for (const [, cards] of bySuit) {
		if (cards.length < 3) continue;

		// Get indices in sequence order
		const indices = cards.map((c) => SEQUENCE_ORDER.indexOf(c.rank)).sort((a, b) => a - b);

		// Check for 4-sequence
		if (cards.length === 4) {
			if (isConsecutive(indices)) {
				return { type: 'sequence', points: 50, cards: [...cards] };
			}
		}

		// Check for 3-sequence (only if exactly 3 cards of same suit, or 4 cards but not consecutive)
		if (cards.length === 3 && isConsecutive(indices)) {
			return { type: 'sequence', points: 20, cards: [...cards] };
		}
	}

	return null;
}

function isConsecutive(sortedIndices: number[]): boolean {
	for (let i = 1; i < sortedIndices.length; i++) {
		if (sortedIndices[i] !== sortedIndices[i - 1] + 1) {
			return false;
		}
	}
	return true;
}

function detectStuk(trick: Card[], trumpSuit: Suit): RoemItem | null {
	const trumpCards = trick.filter((c) => c.suit === trumpSuit);
	const hasKing = trumpCards.some((c) => c.rank === 'K');
	const hasQueen = trumpCards.some((c) => c.rank === 'Q');

	if (hasKing && hasQueen) {
		const stukCards = trumpCards.filter((c) => c.rank === 'K' || c.rank === 'Q');
		return { type: 'stuk', points: 20, cards: stukCards };
	}
	return null;
}

export function getRoemPoints(trick: Card[], trumpSuit: Suit): number {
	const roem = detectRoem(trick, trumpSuit);
	return roem.reduce((sum, r) => sum + r.points, 0);
}

export function validateRoemClaim(trick: Card[], trumpSuit: Suit, claimedPoints: number): boolean {
	const actualPoints = getRoemPoints(trick, trumpSuit);
	return actualPoints === claimedPoints;
}
