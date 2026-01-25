/**
 * Klaverjas game engine.
 * Manages complete game state and flow.
 */

import type { Card, Suit } from './deck';
import { createDeck, shuffle, deal, getCardPoints } from './deck';
import type { PlayedCard } from './rules';
import { getLegalMoves, getTrickWinner } from './rules';
import type { TrickResult, Team, TeamScores } from './scoring';
import { calculateRoundResult, getPlayerTeam, calculateTrickPoints } from './scoring';
import type { RoemClaim, Roem } from './roem';
import { validateRoemClaim } from './roem';

export type GamePhase = 'trump' | 'playing' | 'scoring' | 'finished';

export interface GameState {
	phase: GamePhase;
	round: number;
	dealer: number;
	currentPlayer: number;
	trump: Suit | null;
	playingTeam: Team | null;
	hands: Card[][];
	currentTrick: PlayedCard[];
	completedTricks: TrickResult[];
	roundRoem: { team: Team; points: number }[];
	scores: TeamScores;
	winner: Team | 'tie' | null;
}

const TOTAL_ROUNDS = 16;

/**
 * Creates a new game state with dealt hands.
 */
export function createGame(): GameState {
	const deck = shuffle(createDeck());
	const hands = deal(deck).map((hand) => [...hand]);

	return {
		phase: 'trump',
		round: 1,
		dealer: 0,
		currentPlayer: 1, // Left of dealer
		trump: null,
		playingTeam: null,
		hands,
		currentTrick: [],
		completedTricks: [],
		roundRoem: [],
		scores: { NS: 0, WE: 0 },
		winner: null,
	};
}

/**
 * Starts a new round with fresh hands.
 */
function startNewRound(state: GameState): GameState {
	const deck = shuffle(createDeck());
	const hands = deal(deck).map((hand) => [...hand]);
	const newDealer = (state.dealer + 1) % 4;

	return {
		...state,
		phase: 'trump',
		dealer: newDealer,
		currentPlayer: (newDealer + 1) % 4, // Left of dealer
		trump: null,
		playingTeam: null,
		hands,
		currentTrick: [],
		completedTricks: [],
		roundRoem: [],
	};
}

/**
 * Choose the trump suit (Troef Maken variant).
 * The player left of dealer must choose trump.
 */
export function chooseTrump(state: GameState, trump: Suit): GameState {
	if (state.phase !== 'trump') {
		throw new Error('Cannot choose trump: not in trump selection phase');
	}

	const playingTeam = getPlayerTeam(state.currentPlayer);

	return {
		...state,
		phase: 'playing',
		trump,
		playingTeam,
	};
}

/**
 * Play a card in the current trick.
 */
export function playCard(state: GameState, card: Card): GameState {
	if (state.phase !== 'playing') {
		throw new Error('Cannot play card: not in playing phase');
	}

	if (!state.trump) {
		throw new Error('Cannot play card: no trump selected');
	}

	const player = state.currentPlayer;
	const hand = state.hands[player];

	// Verify card is in hand
	const cardIndex = hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);
	if (cardIndex === -1) {
		throw new Error('Card not in player hand');
	}

	// Verify card is a legal move
	const legalMoves = getLegalMoves(hand, state.currentTrick, state.trump);
	const isLegal = legalMoves.some((c) => c.suit === card.suit && c.rank === card.rank);
	if (!isLegal) {
		throw new Error('Illegal move');
	}

	// Remove card from hand
	const newHands = state.hands.map((h, i) =>
		i === player ? h.filter((_, j) => j !== cardIndex) : [...h]
	);

	// Add card to trick
	const newTrick: PlayedCard[] = [...state.currentTrick, { card, player }];

	// Check if trick is complete (4 cards)
	if (newTrick.length === 4) {
		return completeTrick({
			...state,
			hands: newHands,
			currentTrick: newTrick,
		});
	}

	// Continue to next player
	return {
		...state,
		hands: newHands,
		currentTrick: newTrick,
		currentPlayer: (player + 1) % 4,
	};
}

/**
 * Complete a trick and determine the winner.
 */
function completeTrick(state: GameState): GameState {
	if (!state.trump) {
		throw new Error('No trump selected');
	}

	const winner = getTrickWinner(state.currentTrick, state.trump);
	const points = calculateTrickPoints(
		state.currentTrick.map((pc) => pc.card),
		state.trump
	);

	// Find any roem claimed for this trick
	const trickRoem = state.roundRoem
		.filter((r) => r.team === getPlayerTeam(winner))
		.reduce((sum, r) => sum + r.points, 0);

	const isLastTrick = state.completedTricks.length === 7;

	const trickResult: TrickResult = {
		cards: state.currentTrick.map((pc) => pc.card),
		winner,
		points,
		roem: trickRoem > 0 ? trickRoem : undefined,
		lastTrick: isLastTrick,
	};

	const newCompletedTricks = [...state.completedTricks, trickResult];

	// Check if round is complete (8 tricks)
	if (newCompletedTricks.length === 8) {
		return completeRound({
			...state,
			currentTrick: [],
			completedTricks: newCompletedTricks,
			currentPlayer: winner,
		});
	}

	// Continue to next trick
	return {
		...state,
		currentTrick: [],
		completedTricks: newCompletedTricks,
		currentPlayer: winner,
		roundRoem: [], // Clear roem claims after trick
	};
}

/**
 * Complete a round and calculate scores.
 */
function completeRound(state: GameState): GameState {
	if (!state.playingTeam) {
		throw new Error('No playing team set');
	}

	const roundScores = calculateRoundResult(
		state.completedTricks,
		state.playingTeam,
		{ NS: 0, WE: 0 }
	);

	const newScores: TeamScores = {
		NS: state.scores.NS + roundScores.NS,
		WE: state.scores.WE + roundScores.WE,
	};

	// Check if game is complete
	if (state.round >= TOTAL_ROUNDS) {
		let winner: Team | 'tie' | null = null;
		if (newScores.NS > newScores.WE) {
			winner = 'NS';
		} else if (newScores.WE > newScores.NS) {
			winner = 'WE';
		} else {
			winner = 'tie';
		}

		return {
			...state,
			phase: 'finished',
			scores: newScores,
			winner,
		};
	}

	// Start next round
	return startNewRound({
		...state,
		round: state.round + 1,
		scores: newScores,
	});
}

/**
 * Claim roem for the current player.
 */
export function claimRoem(state: GameState, player: number, claim: RoemClaim): GameState {
	if (state.phase !== 'playing') {
		throw new Error('Cannot claim roem: not in playing phase');
	}

	if (!state.trump) {
		throw new Error('Cannot claim roem: no trump selected');
	}

	// Get available cards (hand + cards in current trick played by this player)
	const playerCardsInTrick = state.currentTrick
		.filter((pc) => pc.player === player)
		.map((pc) => pc.card);
	const availableCards = [...state.hands[player], ...playerCardsInTrick];

	// Validate claim
	const isValid = validateRoemClaim(claim, availableCards, state.trump);
	if (!isValid) {
		throw new Error('Invalid roem claim');
	}

	// Calculate points for this claim
	const points =
		claim.type === 'sequence3'
			? 20
			: claim.type === 'sequence4'
				? 50
				: claim.type === 'stuk'
					? 20
					: claim.type === 'fourOfAKind'
						? 100
						: 0;

	const team = getPlayerTeam(player);

	return {
		...state,
		roundRoem: [...state.roundRoem, { team, points }],
	};
}
