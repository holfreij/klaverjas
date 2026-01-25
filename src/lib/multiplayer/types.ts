/**
 * Multiplayer types for lobby and game synchronization.
 */

import type { Card, Suit } from '$lib/game/deck';
import type { Team, TeamScores } from '$lib/game/scoring';

/**
 * Player seat assignment.
 * 0=South, 1=West, 2=North, 3=East
 * 'spectator' watches with all hands visible
 * 'table' is the shared table device
 */
export type Seat = 0 | 1 | 2 | 3 | 'spectator' | 'table';

/**
 * Player in a lobby.
 */
export interface LobbyPlayer {
	name: string;
	seat: Seat;
	connected: boolean;
	lastSeen: number;
}

/**
 * Lobby status.
 */
export type LobbyStatus = 'waiting' | 'playing' | 'finished';

/**
 * Game phase for multiplayer.
 */
export type MultiplayerGamePhase = 'dealing' | 'trump' | 'playing' | 'scoring' | 'roundEnd';

/**
 * A card played in the current trick.
 */
export interface MultiplayerPlayedCard {
	card: Card;
	seat: number;
}

/**
 * Roem claim submitted by a player.
 */
export interface MultiplayerRoemClaim {
	seat: number;
	type: 'sequence3' | 'sequence4' | 'stuk' | 'fourOfAKind';
	cards: Card[];
	validated: boolean;
	points: number;
}

/**
 * Completed trick result.
 */
export interface MultiplayerTrick {
	cards: MultiplayerPlayedCard[];
	winner: number;
	points: number;
}

/**
 * Game state synchronized via Firebase.
 */
export interface MultiplayerGameState {
	phase: MultiplayerGamePhase;
	round: number;
	dealer: number;
	trump: Suit | null;
	playingTeam: Team | null;
	currentPlayer: number;
	hands: Record<number, Card[]>;
	currentTrick: MultiplayerPlayedCard[];
	completedTricks: MultiplayerTrick[];
	scores: TeamScores;
	roemClaims: MultiplayerRoemClaim[];
}

/**
 * Lobby data stored in Firebase.
 */
export interface Lobby {
	code: string;
	host: string;
	createdAt: number;
	status: LobbyStatus;
	players: Record<string, LobbyPlayer>;
	game: MultiplayerGameState | null;
}

/**
 * Local session data (stored in browser).
 */
export interface LocalSession {
	playerId: string;
	playerName: string;
	lobbyCode: string;
}
