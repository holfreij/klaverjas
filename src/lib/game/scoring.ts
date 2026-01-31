import type { Card, Suit, Rank } from './deck';

// Trump point values: J=20, 9=14, A=11, 10=10, K=4, Q=3, 8=0, 7=0
const TRUMP_POINTS: Record<Rank, number> = {
	J: 20,
	'9': 14,
	A: 11,
	'10': 10,
	K: 4,
	Q: 3,
	'8': 0,
	'7': 0
};

// Non-trump point values: A=11, 10=10, K=4, Q=3, J=2, 9=0, 8=0, 7=0
const NON_TRUMP_POINTS: Record<Rank, number> = {
	A: 11,
	'10': 10,
	K: 4,
	Q: 3,
	J: 2,
	'9': 0,
	'8': 0,
	'7': 0
};

const BASE_POINTS = 162; // 152 card points + 10 last trick bonus
const PIT_BONUS = 100;

export function getCardPoints(card: Card, trumpSuit: Suit): number {
	if (card.suit === trumpSuit) {
		return TRUMP_POINTS[card.rank];
	}
	return NON_TRUMP_POINTS[card.rank];
}

export function calculateTrickPoints(trick: Card[], trumpSuit: Suit): number {
	return trick.reduce((sum, card) => sum + getCardPoints(card, trumpSuit), 0);
}

export function calculateMajorityThreshold(totalRoem: number): number {
	const totalPoints = BASE_POINTS + totalRoem;
	return Math.floor(totalPoints / 2) + 1;
}

export interface RoundInput {
	playingTeamPoints: number;
	defendingTeamPoints: number;
	playingTeamRoem: number;
	defendingTeamRoem: number;
	playingTeamTricks: number;
	isVerzaakt: boolean;
	verzaaktByPlayingTeam?: boolean;
}

export interface RoundResult {
	playingTeamScore: number;
	defendingTeamScore: number;
	isNat: boolean;
	isPit: boolean;
}

export function calculateRoundResult(input: RoundInput): RoundResult {
	const totalRoem = input.playingTeamRoem + input.defendingTeamRoem;

	// Handle verzaakt
	if (input.isVerzaakt) {
		if (input.verzaaktByPlayingTeam) {
			return {
				playingTeamScore: 0,
				defendingTeamScore: BASE_POINTS + totalRoem,
				isNat: false,
				isPit: false
			};
		} else {
			return {
				playingTeamScore: BASE_POINTS + totalRoem,
				defendingTeamScore: 0,
				isNat: false,
				isPit: false
			};
		}
	}

	// Check for pit (playing team wins all 8 tricks)
	if (input.playingTeamTricks === 8) {
		return {
			playingTeamScore: BASE_POINTS + PIT_BONUS + input.playingTeamRoem,
			defendingTeamScore: 0,
			isNat: false,
			isPit: true
		};
	}

	// Calculate threshold
	const threshold = calculateMajorityThreshold(totalRoem);
	const playingTeamTotal = input.playingTeamPoints + input.playingTeamRoem;

	// Check for nat (playing team fails to reach threshold)
	if (playingTeamTotal < threshold) {
		return {
			playingTeamScore: 0,
			defendingTeamScore: BASE_POINTS + totalRoem,
			isNat: true,
			isPit: false
		};
	}

	// Normal win
	return {
		playingTeamScore: input.playingTeamPoints + input.playingTeamRoem,
		defendingTeamScore: input.defendingTeamPoints + input.defendingTeamRoem,
		isNat: false,
		isPit: false
	};
}
