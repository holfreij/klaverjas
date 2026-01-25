/**
 * Roem (bonus combinations) detection and validation for Klaverjas.
 *
 * Roem types:
 * - sequence3: Three consecutive cards of same suit (20 points)
 * - sequence4: Four consecutive cards of same suit (50 points)
 * - stuk: King and Queen of trump suit (20 points)
 * - fourOfAKind: Four cards of same rank (100 points)
 *
 * Note: Stacked roem is allowed (e.g., Q-K-A of trump = sequence + stuk)
 */

import type { Card, Suit, Rank } from './deck';
import { SUITS, RANKS } from './deck';

export type RoemType = 'sequence3' | 'sequence4' | 'stuk' | 'fourOfAKind';

export interface Roem {
	type: RoemType;
	points: number;
	cards: Card[];
}

export interface RoemClaim {
	type: RoemType;
	cards: Card[];
}

export interface DetectedRoem {
	claims: Roem[];
	totalPoints: number;
}

/**
 * Sequence order for roem detection.
 * Index represents position in sequence.
 */
const SEQUENCE_ORDER: readonly Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Ranks that count for four-of-a-kind (7 and 8 don't count).
 */
const FOUR_OF_A_KIND_RANKS: readonly Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Gets the sequence index for a rank.
 */
function getSequenceIndex(rank: Rank): number {
	return SEQUENCE_ORDER.indexOf(rank);
}

/**
 * Checks if two cards are equal (same suit and rank).
 */
function cardsEqual(a: Card, b: Card): boolean {
	return a.suit === b.suit && a.rank === b.rank;
}

/**
 * Checks if a card is in a list of cards.
 */
function cardInList(card: Card, list: Card[]): boolean {
	return list.some((c) => cardsEqual(c, card));
}

/**
 * Detects all sequences (3+ consecutive cards of same suit) in a set of cards.
 * A longer sequence (4+) is worth more than a shorter one.
 */
export function detectSequences(cards: Card[]): Roem[] {
	const sequences: Roem[] = [];

	for (const suit of SUITS) {
		const suitCards = cards.filter((c) => c.suit === suit);
		if (suitCards.length < 3) continue;

		// Sort by sequence order
		const sorted = suitCards.sort(
			(a, b) => getSequenceIndex(a.rank) - getSequenceIndex(b.rank)
		);

		// Find consecutive runs
		let runStart = 0;
		for (let i = 1; i <= sorted.length; i++) {
			const isConsecutive =
				i < sorted.length &&
				getSequenceIndex(sorted[i].rank) === getSequenceIndex(sorted[i - 1].rank) + 1;

			if (!isConsecutive) {
				const runLength = i - runStart;

				if (runLength >= 4) {
					// 4+ card sequence
					sequences.push({
						type: 'sequence4',
						points: 50,
						cards: sorted.slice(runStart, i),
					});
				} else if (runLength === 3) {
					// 3 card sequence
					sequences.push({
						type: 'sequence3',
						points: 20,
						cards: sorted.slice(runStart, i),
					});
				}

				runStart = i;
			}
		}
	}

	return sequences;
}

/**
 * Detects stuk (King and Queen of trump) in a set of cards.
 * Returns null if no stuk found.
 */
export function detectStuk(cards: Card[], trump: Suit): Roem | null {
	const trumpK = cards.find((c) => c.suit === trump && c.rank === 'K');
	const trumpQ = cards.find((c) => c.suit === trump && c.rank === 'Q');

	if (trumpK && trumpQ) {
		return {
			type: 'stuk',
			points: 20,
			cards: [trumpK, trumpQ],
		};
	}

	return null;
}

/**
 * Detects four-of-a-kind combinations in a set of cards.
 * Note: Four 7s or 8s don't count (no point value).
 */
export function detectFourOfAKind(cards: Card[]): Roem[] {
	const fourOfAKinds: Roem[] = [];

	for (const rank of FOUR_OF_A_KIND_RANKS) {
		const matching = cards.filter((c) => c.rank === rank);

		if (matching.length === 4) {
			fourOfAKinds.push({
				type: 'fourOfAKind',
				points: 100,
				cards: matching,
			});
		}
	}

	return fourOfAKinds;
}

/**
 * Detects all roem in a set of cards.
 * Stacked roem is allowed (e.g., Q-K-A of trump counts as both sequence and stuk).
 */
export function detectAllRoem(cards: Card[], trump: Suit): DetectedRoem {
	const claims: Roem[] = [];

	// Detect sequences
	claims.push(...detectSequences(cards));

	// Detect stuk
	const stuk = detectStuk(cards, trump);
	if (stuk) {
		claims.push(stuk);
	}

	// Detect four-of-a-kind
	claims.push(...detectFourOfAKind(cards));

	const totalPoints = claims.reduce((sum, claim) => sum + claim.points, 0);

	return { claims, totalPoints };
}

/**
 * Validates a roem claim against the actual cards.
 * Players must manually claim roem, and the system validates.
 *
 * @param claim The roem claim to validate
 * @param availableCards Cards available for the claim (player's hand + cards in trick)
 * @param trump The current trump suit
 * @returns true if the claim is valid
 */
export function validateRoemClaim(
	claim: RoemClaim,
	availableCards: Card[],
	trump: Suit
): boolean {
	// Check all claimed cards are in available cards
	for (const claimedCard of claim.cards) {
		if (!cardInList(claimedCard, availableCards)) {
			return false;
		}
	}

	// Validate based on claim type
	switch (claim.type) {
		case 'sequence3':
			return validateSequence(claim.cards, 3);
		case 'sequence4':
			return validateSequence(claim.cards, 4);
		case 'stuk':
			return validateStuk(claim.cards, trump);
		case 'fourOfAKind':
			return validateFourOfAKind(claim.cards);
		default:
			return false;
	}
}

/**
 * Validates a sequence claim.
 */
function validateSequence(cards: Card[], requiredLength: number): boolean {
	if (cards.length < requiredLength) return false;

	// All same suit
	const suit = cards[0].suit;
	if (!cards.every((c) => c.suit === suit)) return false;

	// Sort by sequence order and check consecutive
	const sorted = [...cards].sort(
		(a, b) => getSequenceIndex(a.rank) - getSequenceIndex(b.rank)
	);

	for (let i = 1; i < sorted.length; i++) {
		if (getSequenceIndex(sorted[i].rank) !== getSequenceIndex(sorted[i - 1].rank) + 1) {
			return false;
		}
	}

	return true;
}

/**
 * Validates a stuk claim.
 */
function validateStuk(cards: Card[], trump: Suit): boolean {
	if (cards.length !== 2) return false;

	const hasKing = cards.some((c) => c.suit === trump && c.rank === 'K');
	const hasQueen = cards.some((c) => c.suit === trump && c.rank === 'Q');

	return hasKing && hasQueen;
}

/**
 * Validates a four-of-a-kind claim.
 */
function validateFourOfAKind(cards: Card[]): boolean {
	if (cards.length !== 4) return false;

	const rank = cards[0].rank;

	// Must be a valid four-of-a-kind rank
	if (!FOUR_OF_A_KIND_RANKS.includes(rank)) return false;

	// All same rank
	if (!cards.every((c) => c.rank === rank)) return false;

	// All different suits
	const suits = new Set(cards.map((c) => c.suit));
	return suits.size === 4;
}
