import type { Card } from '$lib/game/deck';
import type { GameState as EngineGameState, TrickCard } from '$lib/game/game';
import { determineTrickWinner } from '$lib/game/rules';
import { getSeatTeam } from './types';
import type {
	GameState as MultiplayerGameState,
	GamePhase,
	PlayerSeat,
	PlayedCard,
	CompletedTrick,
	Team
} from './types';

/**
 * Convert engine GameState → multiplayer GameState (for writing to Firebase).
 */
export function engineToMultiplayer(
	engine: EngineGameState,
	phase: GamePhase,
	roundNum: number,
	trickNum: number
): MultiplayerGameState {
	const round = engine.round!;

	// Convert TrickCard[] to PlayedCard[]
	const currentTrick: PlayedCard[] = round.currentTrick.map((tc) => ({
		seat: tc.player,
		card: tc.card
	}));

	// Convert playedCards (TrickCard[][]) to CompletedTrick[]
	const completedTricks: CompletedTrick[] = round.playedCards.map((trickCards) => {
		const cards: PlayedCard[] = trickCards.map((tc) => ({
			seat: tc.player,
			card: tc.card
		}));

		// Determine winner
		const justCards = trickCards.map((tc) => tc.card);
		const winnerIndex = round.trump ? determineTrickWinner(justCards, round.trump) : 0;
		const winner = trickCards[winnerIndex].player;

		return { cards, winner, roem: 0 };
	});

	// Get current trick's hand snapshot (may not exist after final trick)
	const currentTrickIndex = round.playedCards.length;
	const handsAtTrickStartSnap =
		round.handSnapshots[currentTrickIndex] ??
		round.handSnapshots[Math.max(0, currentTrickIndex - 1)] ??
		round.handSnapshots[0];
	const emptyHands = { 0: [] as Card[], 1: [] as Card[], 2: [] as Card[], 3: [] as Card[] };
	const safeHandsAtTrickStart = handsAtTrickStartSnap ?? emptyHands;

	return {
		phase,
		round: roundNum,
		trick: trickNum,
		dealer: engine.dealer,
		trump: round.trump,
		trumpChooser: round.trumpChooser,
		playingTeam: round.playingTeam,
		currentPlayer: round.currentPlayer,
		handsAtTrickStart: {
			0: [...(safeHandsAtTrickStart[0] ?? [])],
			1: [...(safeHandsAtTrickStart[1] ?? [])],
			2: [...(safeHandsAtTrickStart[2] ?? [])],
			3: [...(safeHandsAtTrickStart[3] ?? [])]
		},
		hands: {
			0: [...round.hands[0]],
			1: [...round.hands[1]],
			2: [...round.hands[2]],
			3: [...round.hands[3]]
		},
		currentTrick,
		completedTricks,
		scores: {
			ns: { base: round.points.ns, roem: round.roem.ns },
			we: { base: round.points.we, roem: round.roem.we }
		},
		gameScores: { ...engine.scores },
		roemClaimed: false,
		roemClaimPending: null,
		roemPointsPending: 0,
		lastNotification: null,
		skipVotes: []
	};
}

/**
 * Convert multiplayer GameState → engine GameState (for calling engine functions).
 */
export function multiplayerToEngine(mp: MultiplayerGameState): EngineGameState {
	// Firebase may drop empty arrays/objects, so default everything
	const hands = mp.hands ?? { 0: [], 1: [], 2: [], 3: [] };
	const handsAtTrickStart = mp.handsAtTrickStart ?? { 0: [], 1: [], 2: [], 3: [] };

	// Convert PlayedCard[] to TrickCard[] (Firebase may return undefined for empty arrays)
	const currentTrick: TrickCard[] = (mp.currentTrick ?? []).map((pc) => ({
		player: pc.seat,
		card: pc.card
	}));

	// Convert CompletedTrick[] to TrickCard[][] (Firebase may return undefined for empty arrays)
	const playedCards: TrickCard[][] = (mp.completedTricks ?? []).map((ct) =>
		ct.cards.map((pc) => ({
			player: pc.seat,
			card: pc.card
		}))
	);

	// Calculate tricksWon from completedTricks
	const tricksWon: Record<Team, number> = { ns: 0, we: 0 };
	for (const ct of mp.completedTricks ?? []) {
		const team = getSeatTeam(ct.winner);
		tricksWon[team] += 1;
	}

	// Build handSnapshots from handsAtTrickStart
	const currentTrickIndex = (mp.completedTricks ?? []).length;
	const handSnapshots: Record<number, Record<PlayerSeat, import('$lib/game/deck').Hand>> = {
		[currentTrickIndex]: {
			0: [...(handsAtTrickStart[0] ?? [])],
			1: [...(handsAtTrickStart[1] ?? [])],
			2: [...(handsAtTrickStart[2] ?? [])],
			3: [...(handsAtTrickStart[3] ?? [])]
		}
	};

	return {
		totalRounds: 16,
		currentRound: mp.round - 1, // mp.round is 1-based, engine is 0-based
		dealer: mp.dealer,
		scores: { ...mp.gameScores },
		round: {
			hands: {
				0: [...(hands[0] ?? [])],
				1: [...(hands[1] ?? [])],
				2: [...(hands[2] ?? [])],
				3: [...(hands[3] ?? [])]
			},
			handSnapshots,
			trump: mp.trump,
			trumpChooser: mp.trumpChooser,
			playingTeam: mp.playingTeam,
			currentPlayer: mp.currentPlayer,
			currentTrick,
			tricksPlayed: (mp.completedTricks ?? []).length,
			tricksWon,
			points: {
				ns: mp.scores.ns.base,
				we: mp.scores.we.base
			},
			roem: {
				ns: mp.scores.ns.roem,
				we: mp.scores.we.roem
			},
			playedCards
		}
	};
}
