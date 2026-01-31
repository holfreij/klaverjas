import type { Card, Suit, Rank, Hand } from './deck';

export type Position = 'south' | 'west' | 'north' | 'east';

export interface PlayedMove {
	player: Position;
	card: Card;
	trickNumber: number;
}

export interface IllegalMove extends PlayedMove {
	legalMoves: Card[];
}

// Trump rank order (high to low): J-9-A-10-K-Q-8-7
const TRUMP_STRENGTH: Record<Rank, number> = {
	J: 7,
	'9': 6,
	A: 5,
	'10': 4,
	K: 3,
	Q: 2,
	'8': 1,
	'7': 0
};

// Non-trump rank order (high to low): A-10-K-Q-J-9-8-7
const NON_TRUMP_STRENGTH: Record<Rank, number> = {
	A: 7,
	'10': 6,
	K: 5,
	Q: 4,
	J: 3,
	'9': 2,
	'8': 1,
	'7': 0
};

export function getCardStrength(card: Card, trumpSuit: Suit): number {
	if (card.suit === trumpSuit) {
		return TRUMP_STRENGTH[card.rank];
	}
	return NON_TRUMP_STRENGTH[card.rank];
}

export function getLegalMoves(hand: Card[], trick: Card[], trumpSuit: Suit): Card[] {
	// First card of trick - any card is legal
	if (trick.length === 0) {
		return [...hand];
	}

	const ledSuit = trick[0].suit;

	// Check if player has led suit
	const cardsOfLedSuit = hand.filter((c) => c.suit === ledSuit);
	if (cardsOfLedSuit.length > 0) {
		return cardsOfLedSuit;
	}

	// Player cannot follow suit - check trump requirements
	const trumpsInHand = hand.filter((c) => c.suit === trumpSuit);

	if (trumpsInHand.length === 0) {
		// No trump - can play anything
		return [...hand];
	}

	// Check if there's trump in the trick
	const trumpsInTrick = trick.filter((c) => c.suit === trumpSuit);

	if (trumpsInTrick.length === 0) {
		// No trump in trick - must play any trump
		return trumpsInHand;
	}

	// Trump in trick - must over-trump if possible
	const highestTrumpInTrick = Math.max(...trumpsInTrick.map((c) => getCardStrength(c, trumpSuit)));
	const higherTrumps = trumpsInHand.filter(
		(c) => getCardStrength(c, trumpSuit) > highestTrumpInTrick
	);

	if (higherTrumps.length > 0) {
		return higherTrumps;
	}

	// Cannot over-trump - must under-trump
	return trumpsInHand;
}

export function isLegalMove(card: Card, hand: Card[], trick: Card[], trumpSuit: Suit): boolean {
	const legalMoves = getLegalMoves(hand, trick, trumpSuit);
	return legalMoves.some((c) => c.suit === card.suit && c.rank === card.rank);
}

export function determineTrickWinner(trick: Card[], trumpSuit: Suit): number {
	const ledSuit = trick[0].suit;

	let winningIndex = 0;
	let winningStrength = -1;
	let winnerIsTrump = trick[0].suit === trumpSuit;

	for (let i = 0; i < trick.length; i++) {
		const card = trick[i];
		const isTrump = card.suit === trumpSuit;
		const isLedSuit = card.suit === ledSuit;

		// Skip cards that are neither trump nor led suit
		if (!isTrump && !isLedSuit) {
			continue;
		}

		const strength = getCardStrength(card, trumpSuit);

		// Trump always beats non-trump
		if (isTrump && !winnerIsTrump) {
			winningIndex = i;
			winningStrength = strength;
			winnerIsTrump = true;
		} else if (isTrump === winnerIsTrump && strength > winningStrength) {
			// Same category (both trump or both led suit) - higher strength wins
			winningIndex = i;
			winningStrength = strength;
		}
	}

	return winningIndex;
}

export function checkAllMovesInRound(
	playedMoves: PlayedMove[],
	handSnapshots: Record<number, Record<Position, Hand>>,
	trumpSuit: Suit
): IllegalMove[] {
	const illegalMoves: IllegalMove[] = [];

	// Group moves by trick
	const trickMoves = new Map<number, PlayedMove[]>();
	for (const move of playedMoves) {
		const moves = trickMoves.get(move.trickNumber) || [];
		moves.push(move);
		trickMoves.set(move.trickNumber, moves);
	}

	// Check each trick
	for (const [trickNumber, moves] of trickMoves) {
		const trickCards: Card[] = [];

		for (const move of moves) {
			// Get the player's hand at the start of this trick
			const hand = handSnapshots[trickNumber]?.[move.player];
			if (!hand) continue;

			// Check if this move was legal
			const legal = isLegalMove(move.card, hand, trickCards, trumpSuit);
			if (!legal) {
				illegalMoves.push({
					...move,
					legalMoves: getLegalMoves(hand, trickCards, trumpSuit)
				});
			}

			// Add this card to the trick for the next player's check
			trickCards.push(move.card);
		}
	}

	return illegalMoves;
}
