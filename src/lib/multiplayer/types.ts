import type { Card, Suit } from '$lib/game/deck';

// Seats 0-3 for players, 'table' for table device
export type PlayerSeat = 0 | 1 | 2 | 3;
export type Seat = PlayerSeat | 'table';

// Seat names in Dutch
export const SEAT_NAMES: Record<PlayerSeat, string> = {
	0: 'Zuid',
	1: 'West',
	2: 'Noord',
	3: 'Oost'
};

// Teams: seats 0+2 (Noord-Zuid) vs 1+3 (West-Oost)
export type Team = 'ns' | 'we';

export function getSeatTeam(seat: PlayerSeat): Team {
	return seat === 0 || seat === 2 ? 'ns' : 'we';
}

export interface Player {
	name: string;
	seat: Seat;
	connected: boolean;
	lastSeen: number;
}

export type LobbyStatus = 'waiting' | 'playing' | 'finished';

export interface Lobby {
	code: string;
	host: string; // player ID
	createdAt: number;
	status: LobbyStatus;
	players: Record<string, Player>;
	game: GameState | null;
}

export interface PlayedCard {
	card: Card;
	seat: PlayerSeat;
}

export interface CompletedTrick {
	cards: PlayedCard[];
	winner: PlayerSeat;
	roem: number;
}

export type GamePhase = 'trump' | 'playing' | 'trickEnd' | 'roundEnd' | 'gameEnd';

export interface RoemClaimPending {
	playerId: string;
	amount: number;
}

export type NotificationType =
	| 'roemClaimed'
	| 'roemRejected'
	| 'verzaaktFound'
	| 'verzaaktNotFound';

export interface GameNotification {
	type: NotificationType;
	team?: Team;
	playerSeat?: PlayerSeat;
	points?: number;
	timestamp: number;
}

export interface TeamScore {
	base: number;
	roem: number;
}

export interface GameState {
	phase: GamePhase;
	round: number; // 1-16
	trick: number; // 1-8 within round
	dealer: PlayerSeat;
	trump: Suit | null;
	trumpChooser: PlayerSeat;
	playingTeam: Team | null;
	currentPlayer: PlayerSeat;

	// Hand snapshots for verzaakt detection
	handsAtTrickStart: Record<PlayerSeat, Card[]>;
	hands: Record<PlayerSeat, Card[]>;

	currentTrick: PlayedCard[];
	completedTricks: CompletedTrick[];

	scores: Record<Team, TeamScore>;
	gameScores: Record<Team, number>;

	roemClaimed: boolean;
	roemClaimPending: RoemClaimPending | null;
	roemPointsPending: number;

	lastNotification: GameNotification | null;
	skipVotes: string[]; // player IDs who tapped to skip round-end display
}

// Connection state for UI
export type ConnectionState =
	| 'initial'
	| 'connecting'
	| 'connected'
	| 'disconnected'
	| 'reconnecting'
	| 'error';

// Session data stored in localStorage
export interface SessionData {
	playerId: string;
	lobbyCode: string;
	playerName: string;
}
