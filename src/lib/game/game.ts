import type { Card, Suit, Hand } from './deck';
import { createDeck, shuffleDeck, dealHands } from './deck';
import { determineTrickWinner, checkAllMovesInRound, type PlayedMove } from './rules';
import { calculateTrickPoints, calculateRoundResult } from './scoring';
import { getRoemPoints, validateRoemClaim } from './roem';

export type Position = 'south' | 'west' | 'north' | 'east';
export type Team = 'north_south' | 'west_east';

const POSITIONS: Position[] = ['south', 'west', 'north', 'east'];
const LAST_TRICK_BONUS = 10;

export interface TrickCard {
	player: Position;
	card: Card;
}

export interface RoundState {
	hands: Record<Position, Hand>;
	handSnapshots: Record<number, Record<Position, Hand>>; // Snapshot at start of each trick
	trump: Suit | null;
	trumpChooser: Position;
	playingTeam: Team | null;
	currentPlayer: Position;
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
	dealer: Position;
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
	guiltyPlayer?: Position;
	guiltyTeam?: Team;
}

function getNextPosition(position: Position): Position {
	const index = POSITIONS.indexOf(position);
	return POSITIONS[(index + 1) % 4];
}

function getTeam(position: Position): Team {
	return position === 'north' || position === 'south' ? 'north_south' : 'west_east';
}

export function createGame(): GameState {
	return {
		totalRounds: 16,
		currentRound: 0,
		dealer: 'south',
		scores: { north_south: 0, west_east: 0 },
		round: null
	};
}

export function startRound(game: GameState): RoundState {
	const deck = shuffleDeck(createDeck());
	const [southHand, westHand, northHand, eastHand] = dealHands(deck);

	const trumpChooser = getNextPosition(game.dealer);

	const hands: Record<Position, Hand> = {
		south: southHand,
		west: westHand,
		north: northHand,
		east: eastHand
	};

	// Store initial hand snapshot
	const handSnapshots: Record<number, Record<Position, Hand>> = {
		0: {
			south: [...southHand],
			west: [...westHand],
			north: [...northHand],
			east: [...eastHand]
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
		tricksWon: { north_south: 0, west_east: 0 },
		points: { north_south: 0, west_east: 0 },
		roem: { north_south: 0, west_east: 0 },
		playedCards: []
	};
}

export function chooseTrump(game: GameState, trumpSuit: Suit): void {
	if (!game.round) throw new Error('No active round');

	game.round.trump = trumpSuit;
	game.round.playingTeam = getTeam(game.round.trumpChooser);
	game.round.currentPlayer = game.round.trumpChooser;
}

export function playCard(game: GameState, player: Position, card: Card): void {
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

export function claimRoem(game: GameState, player: Position, claimedPoints: number): RoemClaimResult {
	if (!game.round || !game.round.trump) throw new Error('No active round with trump');

	const trickCards = game.round.currentTrick.map((tc) => tc.card);
	const valid = validateRoemClaim(trickCards, game.round.trump, claimedPoints);

	if (valid) {
		const team = getTeam(player);
		game.round.roem[team] += claimedPoints;
	}

	return { valid, points: valid ? claimedPoints : 0 };
}

export function callVerzaakt(game: GameState, caller: Position): VerzaaktResult {
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
			south: [...game.round.hands.south],
			west: [...game.round.hands.west],
			north: [...game.round.hands.north],
			east: [...game.round.hands.east]
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
		guiltyTeam: getTeam(firstIllegal.player)
	};
}

export function completeTrick(game: GameState): void {
	if (!game.round || !game.round.trump) throw new Error('No active round with trump');

	const trickCards = game.round.currentTrick.map((tc) => tc.card);
	const winnerIndex = determineTrickWinner(trickCards, game.round.trump);
	const winner = game.round.currentTrick[winnerIndex].player;
	const winningTeam = getTeam(winner);

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
			south: [...game.round.hands.south],
			west: [...game.round.hands.west],
			north: [...game.round.hands.north],
			east: [...game.round.hands.east]
		};
	}
}

export function completeRound(game: GameState): void {
	if (!game.round || !game.round.playingTeam) throw new Error('No active round');

	const playingTeam = game.round.playingTeam;
	const defendingTeam: Team = playingTeam === 'north_south' ? 'west_east' : 'north_south';

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

	if (game.scores.north_south > game.scores.west_east) {
		winner = 'north_south';
	} else if (game.scores.west_east > game.scores.north_south) {
		winner = 'west_east';
	}

	return {
		scores: { ...game.scores },
		winner
	};
}
