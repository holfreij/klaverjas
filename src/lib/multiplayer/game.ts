/**
 * Multiplayer game operations - Firebase integration for game state.
 * Handles starting games, playing cards, claiming trump, and roem.
 */

import { ref, get, update, onValue, type Unsubscribe } from 'firebase/database';
import { getDb } from './firebase';
import type {
	Lobby,
	MultiplayerGameState,
	MultiplayerPlayedCard,
	MultiplayerRoemClaim,
	MultiplayerTrick,
} from './types';
import type { Card, Suit } from '$lib/game/deck';
import { createDeck, shuffle, deal } from '$lib/game/deck';
import { getLegalMoves, getTrickWinner, type PlayedCard } from '$lib/game/rules';
import { calculateTrickPoints, getPlayerTeam, calculateRoundResult, type Team } from '$lib/game/scoring';
import { validateRoemClaim, type RoemClaim } from '$lib/game/roem';

const TOTAL_ROUNDS = 16;

/**
 * Get the Firebase reference path for a lobby.
 */
function lobbyRef(code: string) {
	return ref(getDb(), `lobbies/${code}`);
}

/**
 * Get the Firebase reference path for the game in a lobby.
 */
function gameRef(code: string) {
	return ref(getDb(), `lobbies/${code}/game`);
}

/**
 * Start a new game in the lobby.
 * Creates initial game state with dealt hands.
 */
export async function startGame(lobbyCode: string): Promise<void> {
	const snapshot = await get(lobbyRef(lobbyCode));
	if (!snapshot.exists()) {
		throw new Error('Lobby not found');
	}

	const lobby = snapshot.val() as Lobby;

	// Verify lobby is full
	const playerSeats = Object.values(lobby.players || {})
		.map((p) => p.seat)
		.filter((s) => typeof s === 'number');

	if (playerSeats.length !== 4) {
		throw new Error('Cannot start game: need 4 players');
	}

	// Create initial game state
	const deck = shuffle(createDeck());
	const hands = deal(deck);

	const gameState: MultiplayerGameState = {
		phase: 'trump',
		round: 1,
		dealer: 0,
		trump: null,
		playingTeam: null,
		currentPlayer: 1, // Left of dealer
		hands: {
			0: hands[0],
			1: hands[1],
			2: hands[2],
			3: hands[3],
		},
		currentTrick: [],
		completedTricks: [],
		scores: { NS: 0, WE: 0 },
		roemClaims: [],
	};

	// Update lobby status and set game state
	await update(lobbyRef(lobbyCode), {
		status: 'playing',
		game: gameState,
	});
}

/**
 * Select trump suit for the current round.
 */
export async function selectTrump(
	lobbyCode: string,
	playerId: string,
	trump: Suit
): Promise<void> {
	const snapshot = await get(lobbyRef(lobbyCode));
	if (!snapshot.exists()) {
		throw new Error('Lobby not found');
	}

	const lobby = snapshot.val() as Lobby;

	if (!lobby.game) {
		throw new Error('Game not started');
	}

	if (lobby.game.phase !== 'trump') {
		throw new Error('Not in trump selection phase');
	}

	// Verify it's this player's turn
	const player = lobby.players[playerId];
	if (!player || typeof player.seat !== 'number') {
		throw new Error('Player not in a seat');
	}

	if (player.seat !== lobby.game.currentPlayer) {
		throw new Error('Not your turn to select trump');
	}

	const playingTeam = getPlayerTeam(player.seat);

	await update(gameRef(lobbyCode), {
		phase: 'playing',
		trump,
		playingTeam,
	});
}

/**
 * Play a card in the current trick.
 */
export async function playCardMultiplayer(
	lobbyCode: string,
	playerId: string,
	card: Card
): Promise<void> {
	const snapshot = await get(lobbyRef(lobbyCode));
	if (!snapshot.exists()) {
		throw new Error('Lobby not found');
	}

	const lobby = snapshot.val() as Lobby;

	if (!lobby.game) {
		throw new Error('Game not started');
	}

	if (lobby.game.phase !== 'playing') {
		throw new Error('Not in playing phase');
	}

	if (!lobby.game.trump) {
		throw new Error('No trump selected');
	}

	// Verify it's this player's turn
	const player = lobby.players[playerId];
	if (!player || typeof player.seat !== 'number') {
		throw new Error('Player not in a seat');
	}

	const seat = player.seat;
	if (seat !== lobby.game.currentPlayer) {
		throw new Error('Not your turn');
	}

	// Get the player's hand
	const hand = lobby.game.hands[seat];
	if (!hand) {
		throw new Error('No hand for player');
	}

	// Verify card is in hand
	const cardIndex = hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);
	if (cardIndex === -1) {
		throw new Error('Card not in hand');
	}

	// Convert current trick to PlayedCard format for rules check
	const currentTrick: PlayedCard[] = lobby.game.currentTrick.map((pc) => ({
		card: pc.card,
		player: pc.seat,
	}));

	// Verify card is a legal move
	const legalMoves = getLegalMoves(hand, currentTrick, lobby.game.trump);
	const isLegal = legalMoves.some((c) => c.suit === card.suit && c.rank === card.rank);
	if (!isLegal) {
		throw new Error('Illegal move');
	}

	// Remove card from hand
	const newHand = hand.filter((_, i) => i !== cardIndex);

	// Add card to trick
	const newTrick: MultiplayerPlayedCard[] = [...lobby.game.currentTrick, { card, seat }];

	// Build the update object
	const updates: Record<string, unknown> = {
		[`hands/${seat}`]: newHand,
		currentTrick: newTrick,
	};

	// Check if trick is complete (4 cards)
	if (newTrick.length === 4) {
		// Complete the trick
		const trickAsPlayedCards: PlayedCard[] = newTrick.map((pc) => ({
			card: pc.card,
			player: pc.seat,
		}));
		const winner = getTrickWinner(trickAsPlayedCards, lobby.game.trump);
		const points = calculateTrickPoints(
			newTrick.map((pc) => pc.card),
			lobby.game.trump
		);

		// Calculate roem for this trick (from claims made by winning team)
		const winnerTeam = getPlayerTeam(winner);
		const trickRoem = lobby.game.roemClaims
			.filter((r) => r.validated && getPlayerTeam(r.seat) === winnerTeam)
			.reduce((sum, r) => sum + r.points, 0);

		const isLastTrick = lobby.game.completedTricks.length === 7;

		const trickResult: MultiplayerTrick = {
			cards: newTrick,
			winner,
			points: points + (trickRoem > 0 ? trickRoem : 0),
		};

		const newCompletedTricks = [...lobby.game.completedTricks, trickResult];

		updates.currentTrick = [];
		updates.completedTricks = newCompletedTricks;
		updates.currentPlayer = winner;
		updates.roemClaims = []; // Clear roem claims after trick

		// Check if round is complete (8 tricks)
		if (newCompletedTricks.length === 8) {
			await completeRound(lobbyCode, lobby, newCompletedTricks, winner);
			return;
		}
	} else {
		// Continue to next player
		updates.currentPlayer = (seat + 1) % 4;
	}

	await update(gameRef(lobbyCode), updates);
}

/**
 * Complete a round and calculate scores.
 */
async function completeRound(
	lobbyCode: string,
	lobby: Lobby,
	completedTricks: MultiplayerTrick[],
	lastWinner: number
): Promise<void> {
	if (!lobby.game || !lobby.game.playingTeam) {
		throw new Error('Invalid game state');
	}

	// Convert MultiplayerTrick to TrickResult format for scoring
	const trickResults = completedTricks.map((trick, index) => ({
		cards: trick.cards.map((pc) => pc.card),
		winner: trick.winner,
		points: trick.points,
		lastTrick: index === 7,
	}));

	const roundScores = calculateRoundResult(
		trickResults,
		lobby.game.playingTeam,
		{ NS: 0, WE: 0 } // Roem already included in trick points
	);

	const newScores = {
		NS: lobby.game.scores.NS + roundScores.NS,
		WE: lobby.game.scores.WE + roundScores.WE,
	};

	// Check if game is complete
	if (lobby.game.round >= TOTAL_ROUNDS) {
		let winner: Team | 'tie' | null = null;
		if (newScores.NS > newScores.WE) {
			winner = 'NS';
		} else if (newScores.WE > newScores.NS) {
			winner = 'WE';
		} else {
			winner = 'tie';
		}

		await update(lobbyRef(lobbyCode), {
			status: 'finished',
			'game/phase': 'roundEnd',
			'game/scores': newScores,
			'game/completedTricks': completedTricks,
			'game/currentTrick': [],
			'game/currentPlayer': lastWinner,
		});

		return;
	}

	// Start next round
	const deck = shuffle(createDeck());
	const hands = deal(deck);
	const newDealer = (lobby.game.dealer + 1) % 4;

	const newGameState: MultiplayerGameState = {
		phase: 'trump',
		round: lobby.game.round + 1,
		dealer: newDealer,
		trump: null,
		playingTeam: null,
		currentPlayer: (newDealer + 1) % 4,
		hands: {
			0: hands[0],
			1: hands[1],
			2: hands[2],
			3: hands[3],
		},
		currentTrick: [],
		completedTricks: [],
		scores: newScores,
		roemClaims: [],
	};

	await update(lobbyRef(lobbyCode), {
		game: newGameState,
	});
}

/**
 * Claim roem for a player.
 */
export async function claimRoemMultiplayer(
	lobbyCode: string,
	playerId: string,
	claim: RoemClaim
): Promise<void> {
	const snapshot = await get(lobbyRef(lobbyCode));
	if (!snapshot.exists()) {
		throw new Error('Lobby not found');
	}

	const lobby = snapshot.val() as Lobby;

	if (!lobby.game) {
		throw new Error('Game not started');
	}

	if (lobby.game.phase !== 'playing') {
		throw new Error('Cannot claim roem: not in playing phase');
	}

	if (!lobby.game.trump) {
		throw new Error('Cannot claim roem: no trump selected');
	}

	// Verify player
	const player = lobby.players[playerId];
	if (!player || typeof player.seat !== 'number') {
		throw new Error('Player not in a seat');
	}

	const seat = player.seat;

	// Get available cards (hand + cards in current trick played by this player)
	const hand = lobby.game.hands[seat] || [];
	const playerCardsInTrick = lobby.game.currentTrick
		.filter((pc) => pc.seat === seat)
		.map((pc) => pc.card);
	const availableCards = [...hand, ...playerCardsInTrick];

	// Validate claim
	const isValid = validateRoemClaim(claim, availableCards, lobby.game.trump);
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

	const roemClaim: MultiplayerRoemClaim = {
		seat,
		type: claim.type,
		cards: claim.cards,
		validated: true,
		points,
	};

	const newClaims = [...lobby.game.roemClaims, roemClaim];

	await update(gameRef(lobbyCode), {
		roemClaims: newClaims,
	});
}

/**
 * Subscribe to game state updates.
 */
export function subscribeGame(
	lobbyCode: string,
	callback: (game: MultiplayerGameState | null) => void
): Unsubscribe {
	return onValue(gameRef(lobbyCode), (snapshot) => {
		if (!snapshot.exists()) {
			callback(null);
		} else {
			callback(snapshot.val() as MultiplayerGameState);
		}
	});
}

/**
 * Request a rematch - resets the game state for a new game.
 */
export async function requestRematch(lobbyCode: string): Promise<void> {
	const snapshot = await get(lobbyRef(lobbyCode));
	if (!snapshot.exists()) {
		throw new Error('Lobby not found');
	}

	const lobby = snapshot.val() as Lobby;

	if (lobby.status !== 'finished') {
		throw new Error('Game not finished');
	}

	// Reset to waiting state
	await update(lobbyRef(lobbyCode), {
		status: 'waiting',
		game: null,
	});
}

/**
 * Check if it's a player's turn.
 */
export function isPlayerTurn(game: MultiplayerGameState | null, seat: number | null): boolean {
	if (!game || seat === null) return false;
	return game.currentPlayer === seat;
}

/**
 * Get the hand for a specific seat.
 */
export function getHandForSeat(game: MultiplayerGameState | null, seat: number): Card[] {
	if (!game || !game.hands) return [];
	return game.hands[seat] || [];
}

/**
 * Get legal moves for a player.
 */
export function getLegalMovesForPlayer(
	game: MultiplayerGameState | null,
	seat: number
): Card[] {
	if (!game || game.phase !== 'playing' || !game.trump) return [];

	const hand = getHandForSeat(game, seat);
	const currentTrick: PlayedCard[] = game.currentTrick.map((pc) => ({
		card: pc.card,
		player: pc.seat,
	}));

	return getLegalMoves(hand, currentTrick, game.trump);
}
