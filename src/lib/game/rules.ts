/**
 * Klaverjas game rules (Rotterdam variant).
 * Handles legal move validation and trick winner determination.
 */

import type { Card, Suit } from './deck';
import { compareCards } from './deck';

export interface PlayedCard {
	card: Card;
	player: number;
}

/**
 * Trump rank order (index 0 = highest).
 * Used for determining if a trump can beat another trump.
 */
const TRUMP_RANK_ORDER: readonly string[] = ['J', '9', 'A', '10', 'K', 'Q', '8', '7'];

/**
 * Gets the rank index for trump comparison (lower index = higher card).
 */
function getTrumpRankIndex(rank: string): number {
	return TRUMP_RANK_ORDER.indexOf(rank);
}

/**
 * Checks if card A beats card B when both are trump.
 */
function trumpBeats(a: Card, b: Card): boolean {
	return getTrumpRankIndex(a.rank) < getTrumpRankIndex(b.rank);
}

/**
 * Finds the highest trump in the trick.
 * Returns null if no trump has been played.
 */
function getHighestTrump(trick: PlayedCard[], trump: Suit): PlayedCard | null {
	const trumpCards = trick.filter((pc) => pc.card.suit === trump);
	if (trumpCards.length === 0) return null;

	return trumpCards.reduce((highest, current) =>
		trumpBeats(current.card, highest.card) ? current : highest
	);
}

/**
 * Determines which cards can legally be played from a hand.
 *
 * Rotterdam rules:
 * 1. Must follow suit if possible
 * 2. If cannot follow suit, must trump if possible:
 *    - If no trump in trick: any trump
 *    - If trump in trick and can beat it: must play higher trump
 *    - If trump in trick and cannot beat it: any trump (under-trump)
 * 3. If cannot follow suit AND cannot trump: any card
 *
 * Rotterdam-specific: Must ALWAYS trump when can't follow suit, even if
 * partner is winning the trick.
 *
 * @param hand The player's current hand
 * @param trick The cards already played in this trick (empty if leading)
 * @param trump The current trump suit
 * @returns Array of cards that can legally be played
 */
export function getLegalMoves(hand: Card[], trick: PlayedCard[], trump: Suit): Card[] {
	if (hand.length === 0) return [];

	// Leading: can play anything
	if (trick.length === 0) {
		return [...hand];
	}

	const ledSuit = trick[0].card.suit;
	const cardsOfLedSuit = hand.filter((c) => c.suit === ledSuit);

	// Rule 1: Must follow suit if possible
	if (cardsOfLedSuit.length > 0) {
		return cardsOfLedSuit;
	}

	// Cannot follow suit - check trumping requirements
	const trumpCards = hand.filter((c) => c.suit === trump);

	// No trump in hand: can play anything
	if (trumpCards.length === 0) {
		return [...hand];
	}

	// Has trump - must play trump (Rotterdam rule)
	const highestTrumpInTrick = getHighestTrump(trick, trump);

	// No trump in trick yet: any trump is fine
	if (!highestTrumpInTrick) {
		return trumpCards;
	}

	// Trump in trick: must beat it if possible
	const higherTrumps = trumpCards.filter((c) => trumpBeats(c, highestTrumpInTrick.card));

	if (higherTrumps.length > 0) {
		return higherTrumps;
	}

	// Cannot beat existing trump: must under-trump (play any trump)
	return trumpCards;
}

/**
 * Determines which player won the trick.
 *
 * - Highest trump wins if any trump was played
 * - Otherwise, highest card of the led suit wins
 *
 * @param trick The complete trick (4 played cards, or fewer in edge cases)
 * @param trump The current trump suit
 * @returns The player number (0-3) who won the trick
 * @throws Error if trick is empty
 */
export function getTrickWinner(trick: PlayedCard[], trump: Suit): number {
	if (trick.length === 0) {
		throw new Error('Cannot determine winner of empty trick');
	}

	const ledSuit = trick[0].card.suit;
	let winner = trick[0];

	for (let i = 1; i < trick.length; i++) {
		const current = trick[i];
		const comparison = compareCards(current.card, winner.card, trump, ledSuit);
		if (comparison > 0) {
			winner = current;
		}
	}

	return winner.player;
}
