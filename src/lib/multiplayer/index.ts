/**
 * Multiplayer module exports.
 */

export { initFirebase, getDb } from './firebase';
export type {
	Seat,
	LobbyPlayer,
	LobbyStatus,
	MultiplayerGamePhase,
	MultiplayerPlayedCard,
	MultiplayerRoemClaim,
	MultiplayerTrick,
	MultiplayerGameState,
	Lobby,
	LocalSession,
} from './types';
export {
	generateLobbyCode,
	generatePlayerId,
	createLobby,
	joinLobby,
	leaveLobby,
	changeSeat,
	getLobby,
	subscribeLobby,
	isLobbyFull,
	getPlayersBySeat,
	markConnected,
} from './lobby';
export { saveSession, loadSession, clearSession, hasSession } from './session';
export { subscribeConnectionStatus, type ConnectionStatus } from './connection';
