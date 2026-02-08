import { ref, get, update } from 'firebase/database';
import { getFirebaseDatabase } from './firebase';
import type { GameState, PlayerSeat, GameNotification } from './types';
import { getSeatTeam } from './types';
import type { Card, Suit } from '$lib/game/deck';
import { getRoemPoints } from '$lib/game/roem';
import {
	createGame,
	startRound,
	chooseTrump as engineChooseTrump,
	playCard as enginePlayCard,
	completeTrick as engineCompleteTrick,
	completeRound as engineCompleteRound,
	callVerzaakt as engineCallVerzaakt,
	isGameComplete
} from '$lib/game/game';
import { calculateRoundResult } from '$lib/game/scoring';
import { determineTrickWinner } from '$lib/game/rules';
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
	updated.roemPointsPending = current.roemPointsPending ?? 0;
	updated.lastNotification = null;
	updated.skipVotes = Array.isArray(current.skipVotes) ? current.skipVotes : [];

	await writeGameState(lobbyCode, updated);
}

/**
 * Plays a card. Called by the current player.
 * During 'playing' phase: normal card play. After 4th card, transitions to 'trickEnd'.
 * During 'trickEnd' phase: trick winner plays opening card of next trick,
 * atomically completing the old trick and starting the new one.
 */
export async function playCard(lobbyCode: string, seat: PlayerSeat, card: Card): Promise<void> {
	const current = await readGameState(lobbyCode);

	if (current.phase === 'trickEnd') {
		// Only the trick winner (currentPlayer) can play during trickEnd
		if (current.currentPlayer !== seat) {
			throw new Error(`Seat ${seat} cannot play; it is seat ${current.currentPlayer}'s turn`);
		}
		await completeTrickAndPlayCard(lobbyCode, current, seat, card);
		return;
	}

	if (current.phase !== 'playing') {
		throw new Error('Cannot play card: phase is not "playing"');
	}
	if (current.currentPlayer !== seat) {
		throw new Error(`Seat ${seat} cannot play; it is seat ${current.currentPlayer}'s turn`);
	}

	const engine = multiplayerToEngine(current);
	enginePlayCard(engine, seat, card);

	const trickCards = engine.round!.currentTrick;
	const isTrickComplete = trickCards.length === 4;
	const newPhase = isTrickComplete ? 'trickEnd' : 'playing';

	const updated = engineToMultiplayer(engine, newPhase, current.round, current.trick);
	// Preserve multiplayer-only fields
	updated.roemClaimed = current.roemClaimed;
	updated.roemClaimPending = current.roemClaimPending;
	updated.roemPointsPending = current.roemPointsPending ?? 0;
	updated.lastNotification = current.lastNotification ?? null;
	updated.skipVotes = Array.isArray(current.skipVotes) ? current.skipVotes : [];

	// If trick is complete, set currentPlayer to the trick winner
	if (isTrickComplete) {
		const justCards = trickCards.map((tc) => tc.card);
		const winnerIndex = determineTrickWinner(justCards, engine.round!.trump!);
		updated.currentPlayer = trickCards[winnerIndex].player;
	}

	await writeGameState(lobbyCode, updated);
}

/**
 * Atomically completes the current trick (assigning pending roem) and plays
 * the opening card of the next trick. Called when trick winner plays during trickEnd.
 */
async function completeTrickAndPlayCard(
	lobbyCode: string,
	current: GameState,
	seat: PlayerSeat,
	card: Card
): Promise<void> {
	const engine = multiplayerToEngine(current);

	// 1. Complete the trick
	engineCompleteTrick(engine);

	// 2. Assign pending roem to trick winner's team
	const pendingRoem = current.roemPointsPending ?? 0;
	if (pendingRoem > 0) {
		const lastTrick = engine.round!.playedCards[engine.round!.playedCards.length - 1];
		const trickCards = lastTrick.map((tc) => tc.card);
		const winnerIndex = determineTrickWinner(trickCards, engine.round!.trump!);
		const winnerTeam = getSeatTeam(lastTrick[winnerIndex].player);
		engine.round!.roem[winnerTeam] += pendingRoem;
	}

	// 3. Play the new card
	enginePlayCard(engine, seat, card);

	// 4. Build updated state
	const newTrickNum = current.trick + 1;
	const updated = engineToMultiplayer(engine, 'playing', current.round, newTrickNum);
	updated.roemClaimed = false;
	updated.roemClaimPending = null;
	updated.roemPointsPending = 0;
	updated.lastNotification = null;
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

	// Assign pending roem to the trick winner's team
	const pendingRoem = current.roemPointsPending ?? 0;
	if (pendingRoem > 0) {
		// The last completed trick tells us who won
		const lastTrick = engine.round!.playedCards[engine.round!.playedCards.length - 1];
		const trickCards = lastTrick.map((tc) => tc.card);
		const winnerIndex = determineTrickWinner(trickCards, engine.round!.trump!);
		const winnerTeam = getSeatTeam(lastTrick[winnerIndex].player);
		engine.round!.roem[winnerTeam] += pendingRoem;
	}

	// Check if round is complete (8 tricks played)
	if (engine.round!.tricksPlayed === 8) {
		// Build the roundEnd/gameEnd state BEFORE calling completeRound (which clears engine.round)
		const roundEndState = engineToMultiplayer(engine, 'roundEnd', current.round, 8);
		roundEndState.roemClaimed = false;
		roundEndState.roemClaimPending = null;
		roundEndState.roemPointsPending = 0;
		roundEndState.lastNotification = null;
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
		updated.roemPointsPending = 0;
		updated.lastNotification = null;
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
	updated.roemPointsPending = 0;
	updated.lastNotification = null;
	updated.skipVotes = [];

	await writeGameState(lobbyCode, updated);
}

/**
 * Claims roem for the current trick. Auto-detects roem points.
 * Stores pending roem to be assigned to the trick winner on completeTrick.
 */
export async function claimRoem(lobbyCode: string, seat: PlayerSeat): Promise<void> {
	const current = await readGameState(lobbyCode);

	if (current.phase !== 'playing' && current.phase !== 'trickEnd') {
		throw new Error('Cannot claim roem: phase is not "playing" or "trickEnd"');
	}
	if (current.roemClaimed) {
		throw new Error('Roem already claimed this trick');
	}

	const currentTrick = current.currentTrick ?? [];
	if (currentTrick.length === 0) {
		throw new Error('Cannot claim roem: no cards in trick');
	}

	const trickCards = currentTrick.map((pc) => pc.card);
	const points = getRoemPoints(trickCards, current.trump!);

	let notification: GameNotification;
	if (points > 0) {
		notification = {
			type: 'roemClaimed',
			team: getSeatTeam(seat),
			points,
			timestamp: Date.now()
		};
	} else {
		notification = {
			type: 'roemRejected',
			timestamp: Date.now()
		};
	}

	const updated: GameState = {
		...current,
		roemClaimed: true,
		roemPointsPending: points,
		lastNotification: notification
	};

	await writeGameState(lobbyCode, updated);
}

/**
 * Calls verzaakt (illegal move detection). Engine finds the guilty player.
 * If found, ends the round immediately with the guilty team scoring 0.
 */
export async function callVerzaakt(lobbyCode: string, callerSeat: PlayerSeat): Promise<void> {
	const current = await readGameState(lobbyCode);

	if (current.phase !== 'playing' && current.phase !== 'trickEnd') {
		throw new Error('Cannot call verzaakt: phase is not "playing" or "trickEnd"');
	}

	const currentTrick = current.currentTrick ?? [];
	if (currentTrick.length < 2) {
		throw new Error('Cannot call verzaakt: need at least 2 cards in trick');
	}

	const engine = multiplayerToEngine(current);
	const result = engineCallVerzaakt(engine, callerSeat);

	if (!result.verzaaktFound) {
		// No illegal moves found — notify and continue playing
		const notification: GameNotification = {
			type: 'verzaaktNotFound',
			timestamp: Date.now()
		};
		const updated: GameState = {
			...current,
			lastNotification: notification
		};
		await writeGameState(lobbyCode, updated);
		return;
	}

	// Verzaakt found — end the round immediately
	const guiltyTeam = result.guiltyTeam!;
	const playingTeam = current.playingTeam!;
	const defendingTeam: import('./types').Team = playingTeam === 'ns' ? 'we' : 'ns';
	const verzaaktByPlayingTeam = guiltyTeam === playingTeam;

	const roundResult = calculateRoundResult({
		playingTeamPoints: current.scores[playingTeam].base,
		defendingTeamPoints: current.scores[defendingTeam].base,
		playingTeamRoem: current.scores[playingTeam].roem,
		defendingTeamRoem: current.scores[defendingTeam].roem,
		playingTeamTricks: 0, // not relevant for verzaakt
		isVerzaakt: true,
		verzaaktByPlayingTeam
	});

	// Build the round end state from current engine state
	const roundEndState = engineToMultiplayer(engine, 'roundEnd', current.round, current.trick);

	// Override scores with verzaakt result
	roundEndState.scores = {
		[playingTeam]: { base: roundResult.playingTeamScore, roem: 0 },
		[defendingTeam]: { base: roundResult.defendingTeamScore, roem: 0 }
	} as GameState['scores'];

	// Update game totals
	roundEndState.gameScores = {
		...current.gameScores,
		[playingTeam]: current.gameScores[playingTeam] + roundResult.playingTeamScore,
		[defendingTeam]: current.gameScores[defendingTeam] + roundResult.defendingTeamScore
	};

	roundEndState.roemClaimed = false;
	roundEndState.roemClaimPending = null;
	roundEndState.roemPointsPending = 0;
	roundEndState.skipVotes = [];
	roundEndState.lastNotification = {
		type: 'verzaaktFound',
		playerSeat: result.guiltyPlayer,
		team: guiltyTeam,
		timestamp: Date.now()
	};

	// Check if game is complete (16 rounds)
	if (current.round >= 16) {
		roundEndState.phase = 'gameEnd';
	}

	await writeGameState(lobbyCode, roundEndState);
}
