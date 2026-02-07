import type { Card, Suit, Hand } from './deck';
import { createDeck, shuffleDeck, dealHands } from './deck';
import { determineTrickWinner, checkAllMovesInRound, type PlayedMove } from './rules';
import { calculateTrickPoints, calculateRoundResult } from './scoring';
import { validateRoemClaim } from './roem';
import { type PlayerSeat, type Team, getSeatTeam } from '$lib/multiplayer/types';

const LAST_TRICK_BONUS = 10;

export interface TrickCard {
	player: PlayerSeat;
	card: Card;
}

export interface RoundState {
	hands: Record<PlayerSeat, Hand>;
	handSnapshots: Record<number, Record<PlayerSeat, Hand>>; // Snapshot at start of each trick
	trump: Suit | null;
	trumpChooser: PlayerSeat;
	playingTeam: Team | null;
	currentPlayer: PlayerSeat;
	currentTrick: TrickCard[];
	tricksPlayed: number;
	tricksWon: Record<Team, number>;
	points: Record<Team, number>;
	roem: Record<Team, number>;
	playedCards: TrickCard[][]; // All completed tricks
}

export interface GameState {
	totalRounds: number;
	currentRound: number;
	dealer: PlayerSeat;
	scores: Record<Team, number>;
	round: RoundState | null;
}

export interface GameResult {
	scores: Record<Team, number>;
	winner: Team | null;
}

export interface RoemClaimResult {
	valid: boolean;
	points: number;
}

export interface VerzaaktResult {
	verzaaktFound: boolean;
	guiltyPlayer?: PlayerSeat;
	guiltyTeam?: Team;
}

function getNextPosition(position: PlayerSeat): PlayerSeat {
	return ((position + 1) % 4) as PlayerSeat;
}

export function createGame(): GameState {
	return {
		totalRounds: 16,
		currentRound: 0,
		dealer: 0,
		scores: { ns: 0, we: 0 },
		round: null
	};
}

export function startRound(game: GameState): RoundState {
	const deck = shuffleDeck(createDeck());
	const [hand0, hand1, hand2, hand3] = dealHands(deck);

	const trumpChooser = getNextPosition(game.dealer);

	const hands: Record<PlayerSeat, Hand> = {
		0: hand0,
		1: hand1,
		2: hand2,
		3: hand3
	};

	// Store initial hand snapshot
	const handSnapshots: Record<number, Record<PlayerSeat, Hand>> = {
		0: {
			0: [...hand0],
			1: [...hand1],
			2: [...hand2],
			3: [...hand3]
		}
	};

	return {
		hands,
		handSnapshots,
		trump: null,
		trumpChooser,
		playingTeam: null,
		currentPlayer: trumpChooser,
		currentTrick: [],
		tricksPlayed: 0,
		tricksWon: { ns: 0, we: 0 },
		points: { ns: 0, we: 0 },
		roem: { ns: 0, we: 0 },
		playedCards: []
	};
}

export function chooseTrump(game: GameState, trumpSuit: Suit): void {
	if (!game.round) throw new Error('No active round');

	game.round.trump = trumpSuit;
	game.round.playingTeam = getSeatTeam(game.round.trumpChooser);
	game.round.currentPlayer = game.round.trumpChooser;
}

export function playCard(game: GameState, player: PlayerSeat, card: Card): void {
	if (!game.round) throw new Error('No active round');

	// Add card to current trick
	game.round.currentTrick.push({ player, card });

	// Remove card from player's hand
	const handIndex = game.round.hands[player].findIndex(
		(c) => c.suit === card.suit && c.rank === card.rank
	);
	if (handIndex !== -1) {
		game.round.hands[player].splice(handIndex, 1);
	}

	// Advance to next player
	game.round.currentPlayer = getNextPosition(player);
}

export function claimRoem(
	game: GameState,
	player: PlayerSeat,
	claimedPoints: number
): RoemClaimResult {
	if (!game.round || !game.round.trump) throw new Error('No active round with trump');

	const trickCards = game.round.currentTrick.map((tc) => tc.card);
	const valid = validateRoemClaim(trickCards, game.round.trump, claimedPoints);

	if (valid) {
		const team = getSeatTeam(player);
		game.round.roem[team] += claimedPoints;
	}

	return { valid, points: valid ? claimedPoints : 0 };
}

export function callVerzaakt(game: GameState, _caller: PlayerSeat): VerzaaktResult {
	if (!game.round || !game.round.trump) throw new Error('No active round with trump');

	// Must have at least 2 cards in current trick to call verzaakt
	if (game.round.currentTrick.length < 2) {
		throw new Error('Cannot call verzaakt before at least 2 cards are played');
	}

	// Build list of all played moves (completed tricks + current trick)
	const allMoves: PlayedMove[] = [];

	// Add completed tricks
	for (let trickNum = 0; trickNum < game.round.playedCards.length; trickNum++) {
		for (const tc of game.round.playedCards[trickNum]) {
			allMoves.push({
				player: tc.player,
				card: tc.card,
				trickNumber: trickNum
			});
		}
	}

	// Add current trick
	const currentTrickNum = game.round.playedCards.length;
	for (const tc of game.round.currentTrick) {
		allMoves.push({
			player: tc.player,
			card: tc.card,
			trickNumber: currentTrickNum
		});
	}

	// Store snapshot for current trick if not already stored
	if (!game.round.handSnapshots[currentTrickNum]) {
		game.round.handSnapshots[currentTrickNum] = {
			0: [...game.round.hands[0]],
			1: [...game.round.hands[1]],
			2: [...game.round.hands[2]],
			3: [...game.round.hands[3]]
		};
	}

	// Check all moves
	const illegalMoves = checkAllMovesInRound(allMoves, game.round.handSnapshots, game.round.trump);

	if (illegalMoves.length === 0) {
		return { verzaaktFound: false };
	}

	// Find the first illegal move
	const firstIllegal = illegalMoves[0];

	return {
		verzaaktFound: true,
		guiltyPlayer: firstIllegal.player,
		guiltyTeam: getSeatTeam(firstIllegal.player)
	};
}

export function completeTrick(game: GameState): void {
	if (!game.round || !game.round.trump) throw new Error('No active round with trump');

	const trickCards = game.round.currentTrick.map((tc) => tc.card);
	const winnerIndex = determineTrickWinner(trickCards, game.round.trump);
	const winner = game.round.currentTrick[winnerIndex].player;
	const winningTeam = getSeatTeam(winner);

	// Calculate points
	let points = calculateTrickPoints(trickCards, game.round.trump);

	// Add last trick bonus
	if (game.round.tricksPlayed === 7) {
		points += LAST_TRICK_BONUS;
	}

	// Award points to winning team
	game.round.points[winningTeam] += points;
	game.round.tricksWon[winningTeam] += 1;

	// Store completed trick
	game.round.playedCards.push([...game.round.currentTrick]);

	// Reset for next trick
	game.round.currentTrick = [];
	game.round.tricksPlayed += 1;
	game.round.currentPlayer = winner;

	// Store hand snapshot for next trick (for verzaakt checking)
	if (game.round.tricksPlayed < 8) {
		game.round.handSnapshots[game.round.tricksPlayed] = {
			0: [...game.round.hands[0]],
			1: [...game.round.hands[1]],
			2: [...game.round.hands[2]],
			3: [...game.round.hands[3]]
		};
	}
}

export function completeRound(game: GameState): void {
	if (!game.round || !game.round.playingTeam) throw new Error('No active round');

	const playingTeam = game.round.playingTeam;
	const defendingTeam: Team = playingTeam === 'ns' ? 'we' : 'ns';

	const result = calculateRoundResult({
		playingTeamPoints: game.round.points[playingTeam],
		defendingTeamPoints: game.round.points[defendingTeam],
		playingTeamRoem: game.round.roem[playingTeam],
		defendingTeamRoem: game.round.roem[defendingTeam],
		playingTeamTricks: game.round.tricksWon[playingTeam],
		isVerzaakt: false
	});

	// Add round scores to game scores
	game.scores[playingTeam] += result.playingTeamScore;
	game.scores[defendingTeam] += result.defendingTeamScore;

	// Increment round and rotate dealer
	game.currentRound += 1;
	game.dealer = getNextPosition(game.dealer);

	// Clear round
	game.round = null;
}

export function isGameComplete(game: GameState): boolean {
	return game.currentRound >= game.totalRounds;
}

export function getGameResult(game: GameState): GameResult {
	let winner: Team | null = null;

	if (game.scores.ns > game.scores.we) {
		winner = 'ns';
	} else if (game.scores.we > game.scores.ns) {
		winner = 'we';
	}

	return {
		scores: { ...game.scores },
		winner
	};
}
