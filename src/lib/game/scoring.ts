/**
 * Klaverjas scoring system.
 * Handles point calculation, nat, and pit.
 */

import type { Card, Suit } from './deck';
import { getCardPoints } from './deck';

export type Team = 'NS' | 'WE';

export interface TrickResult {
	cards: Card[];
	winner: number; // 0-3 player index
	points: number; // Pre-calculated point value of cards
	roem?: number; // Roem points claimed in this trick
	lastTrick: boolean;
}

export interface TeamScores {
	NS: number;
	WE: number;
}

/**
 * Last trick bonus points.
 */
const LAST_TRICK_BONUS = 10;

/**
 * Pit bonus (playing team wins all 8 tricks).
 */
const PIT_BONUS = 100;

/**
 * Total points available in a round (before last trick bonus).
 */
const TOTAL_CARD_POINTS = 152;

/**
 * Total points with last trick bonus.
 */
const TOTAL_ROUND_POINTS = TOTAL_CARD_POINTS + LAST_TRICK_BONUS;

/**
 * Gets the team for a player index.
 * Players 0 (North) and 2 (South) are NS.
 * Players 1 (West) and 3 (East) are WE.
 */
export function getPlayerTeam(player: number): Team {
	return player % 2 === 0 ? 'NS' : 'WE';
}

/**
 * Calculates the point value of cards in a trick.
 *
 * @param cards The cards in the trick
 * @param trump The current trump suit
 * @returns Total point value
 */
export function calculateTrickPoints(cards: Card[], trump: Suit): number {
	return cards.reduce((sum, card) => sum + getCardPoints(card, trump), 0);
}

/**
 * Calculates the round result after all 8 tricks have been played.
 *
 * Rules:
 * - Each team gets points from tricks they won
 * - Last trick winner gets +10 bonus
 * - Playing team must get > 81 points (majority) or they go "nat"
 * - Nat: playing team gets 0, opponents get 162 + all roem
 * - Pit: if playing team wins all 8 tricks, +100 bonus
 *
 * @param tricks Array of 8 trick results
 * @param playingTeam The team that chose trump
 * @param currentRoem Roem points for each team
 * @returns Points awarded to each team for this round
 */
export function calculateRoundResult(
	tricks: TrickResult[],
	playingTeam: Team,
	currentRoem: TeamScores
): TeamScores {
	const defendingTeam: Team = playingTeam === 'NS' ? 'WE' : 'NS';

	// Calculate raw points for each team
	const rawPoints: TeamScores = { NS: 0, WE: 0 };
	const roemPoints: TeamScores = { NS: 0, WE: 0 };

	let playingTeamTricks = 0;

	for (const trick of tricks) {
		const winnerTeam = getPlayerTeam(trick.winner);

		rawPoints[winnerTeam] += trick.points;

		if (trick.lastTrick) {
			rawPoints[winnerTeam] += LAST_TRICK_BONUS;
		}

		if (trick.roem) {
			roemPoints[winnerTeam] += trick.roem;
		}

		if (winnerTeam === playingTeam) {
			playingTeamTricks++;
		}
	}

	// Check for pit (playing team wins all 8 tricks)
	const isPit = playingTeamTricks === 8;

	// Check for nat (playing team doesn't have majority, i.e., <= 81 points)
	// Note: roem is NOT counted when determining nat
	const playingTeamBasePoints = rawPoints[playingTeam];
	const isNat = playingTeamBasePoints <= TOTAL_ROUND_POINTS / 2; // <= 81

	if (isNat) {
		// Playing team goes nat: they get 0, opponents get 162 + all roem
		const totalRoem = roemPoints.NS + roemPoints.WE;
		const natResult: TeamScores = { NS: 0, WE: 0 };
		natResult[playingTeam] = 0;
		natResult[defendingTeam] = TOTAL_ROUND_POINTS + totalRoem;
		return natResult;
	}

	// Normal result
	const result: TeamScores = {
		NS: rawPoints.NS + roemPoints.NS,
		WE: rawPoints.WE + roemPoints.WE,
	};

	// Add pit bonus if applicable
	if (isPit) {
		result[playingTeam] += PIT_BONUS;
	}

	return result;
}
