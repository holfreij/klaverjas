import { ref, get, update } from 'firebase/database';
import { getFirebaseDatabase } from './firebase';
import type { GameState, PlayerSeat } from './types';
import type { Card, Suit } from '$lib/game/deck';
import {
	createGame,
	startRound,
	chooseTrump as engineChooseTrump,
	playCard as enginePlayCard,
	completeTrick as engineCompleteTrick,
	completeRound as engineCompleteRound,
	isGameComplete
} from '$lib/game/game';
import { engineToMultiplayer, multiplayerToEngine } from './gameStateConverter';

function getGameRef(lobbyCode: string) {
	const db = getFirebaseDatabase();
	return ref(db, `lobbies/${lobbyCode}/game`);
}

async function readGameState(lobbyCode: string): Promise<GameState> {
	const gameRef = getGameRef(lobbyCode);
	const snapshot = await get(gameRef);
	if (!snapshot.exists()) {
		throw new Error('No game state found');
	}
	return snapshot.val() as GameState;
}

/**
 * Recursively replace undefined with null for Firebase compatibility.
 * Firebase rejects undefined values but accepts null.
 */
function sanitizeForFirebase<T>(obj: T): T {
	if (obj === undefined) return null as T;
	if (obj === null || typeof obj !== 'object') return obj;
	if (Array.isArray(obj)) {
		return obj.map(sanitizeForFirebase) as T;
	}
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		result[key] = sanitizeForFirebase(value);
	}
	return result as T;
}

async function writeGameState(lobbyCode: string, gameState: GameState): Promise<void> {
	const lobbyRef = ref(getFirebaseDatabase(), `lobbies/${lobbyCode}`);
	await update(lobbyRef, { game: sanitizeForFirebase(gameState) });
}

/**
 * Creates initial game state, deals cards, and writes to Firebase.
 * Called by host when clicking "Start spel".
 */
export async function initializeGame(lobbyCode: string): Promise<void> {
	const engine = createGame();
	engine.round = startRound(engine);

	const mpState = engineToMultiplayer(engine, 'trump', 1, 1);
	await writeGameState(lobbyCode, mpState);
}

/**
 * Sets the trump suit. Called by the trump chooser.
 */
export async function chooseTrump(
	lobbyCode: string,
	seat: PlayerSeat,
	trumpSuit: Suit
): Promise<void> {
	const current = await readGameState(lobbyCode);

	if (current.phase !== 'trump') {
		throw new Error('Cannot choose trump: phase is not "trump"');
	}
	if (current.trumpChooser !== seat) {
		throw new Error(`Seat ${seat} cannot choose trump; it is seat ${current.trumpChooser}'s turn`);
	}

	const engine = multiplayerToEngine(current);
	engineChooseTrump(engine, trumpSuit);

	const updated = engineToMultiplayer(engine, 'playing', current.round, current.trick);
	// Preserve multiplayer-only fields
	updated.roemClaimed = current.roemClaimed;
	updated.roemClaimPending = current.roemClaimPending;
	updated.skipVotes = Array.isArray(current.skipVotes) ? current.skipVotes : [];

	await writeGameState(lobbyCode, updated);
}

/**
 * Plays a card. Called by the current player.
 */
export async function playCard(lobbyCode: string, seat: PlayerSeat, card: Card): Promise<void> {
	const current = await readGameState(lobbyCode);

	if (current.phase !== 'playing') {
		throw new Error('Cannot play card: phase is not "playing"');
	}
	if (current.currentPlayer !== seat) {
		throw new Error(`Seat ${seat} cannot play; it is seat ${current.currentPlayer}'s turn`);
	}

	const engine = multiplayerToEngine(current);
	enginePlayCard(engine, seat, card);

	const updated = engineToMultiplayer(engine, 'playing', current.round, current.trick);
	// Preserve multiplayer-only fields
	updated.roemClaimed = current.roemClaimed;
	updated.roemClaimPending = current.roemClaimPending;
	updated.skipVotes = Array.isArray(current.skipVotes) ? current.skipVotes : [];

	await writeGameState(lobbyCode, updated);
}

/**
 * Completes the current trick after all 4 cards are played.
 * Idempotent: no-op if trick doesn't have 4 cards.
 */
export async function completeTrick(lobbyCode: string): Promise<void> {
	const current = await readGameState(lobbyCode);

	// Idempotent: if less than 4 cards, nothing to do
	if (!current.currentTrick || current.currentTrick.length < 4) {
		return;
	}

	const engine = multiplayerToEngine(current);
	engineCompleteTrick(engine);

	// Check if round is complete (8 tricks played)
	if (engine.round!.tricksPlayed === 8) {
		// Build the roundEnd/gameEnd state BEFORE calling completeRound (which clears engine.round)
		const roundEndState = engineToMultiplayer(engine, 'roundEnd', current.round, 8);
		roundEndState.roemClaimed = false;
		roundEndState.roemClaimPending = null;
		roundEndState.skipVotes = [];

		// Now complete the round in the engine to get updated game scores
		engineCompleteRound(engine);
		roundEndState.gameScores = { ...engine.scores };

		if (isGameComplete(engine)) {
			roundEndState.phase = 'gameEnd';
		}

		await writeGameState(lobbyCode, roundEndState);
	} else {
		// Trick completed, round continues
		const newTrickNum = current.trick + 1;
		const updated = engineToMultiplayer(engine, 'playing', current.round, newTrickNum);
		updated.roemClaimed = false; // Reset roem claimed for new trick
		updated.roemClaimPending = null;
		updated.skipVotes = Array.isArray(current.skipVotes) ? current.skipVotes : [];

		await writeGameState(lobbyCode, updated);
	}
}

/**
 * Starts the next round after round end display.
 * Idempotent: no-op if phase is not 'roundEnd'.
 */
export async function startNextRound(lobbyCode: string): Promise<void> {
	const current = await readGameState(lobbyCode);

	// Idempotent: only proceed if in roundEnd phase
	if (current.phase !== 'roundEnd') {
		return;
	}

	const nextRoundNum = current.round + 1;

	if (nextRoundNum > 16) {
		// Game is complete
		const updated = { ...current, phase: 'gameEnd' as const };
		await writeGameState(lobbyCode, updated);
		return;
	}

	// Create new engine state with the accumulated game scores
	const engine = createGame();
	engine.scores = { ...current.gameScores };
	engine.currentRound = current.round; // Number of completed rounds (0-based)

	// Rotate dealer: dealer advances by 1 each round
	engine.dealer = ((current.dealer + 1) % 4) as PlayerSeat;

	// Deal new round
	engine.round = startRound(engine);

	const updated = engineToMultiplayer(engine, 'trump', nextRoundNum, 1);
	updated.roemClaimed = false;
	updated.roemClaimPending = null;
	updated.skipVotes = [];

	await writeGameState(lobbyCode, updated);
}
