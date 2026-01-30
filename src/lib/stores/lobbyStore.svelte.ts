/**
 * Svelte 5 store for lobby state management.
 * Handles Firebase sync, session persistence, and connection status.
 */

import { initFirebase } from '$lib/multiplayer/firebase';
import type { Lobby, LocalSession, Seat } from '$lib/multiplayer/types';
import {
	createLobby,
	joinLobby,
	leaveLobby,
	changeSeat,
	subscribeLobby,
	markConnected,
	isLobbyFull,
	getPlayersBySeat,
	getLobby,
} from '$lib/multiplayer/lobby';
import { saveSession, loadSession, clearSession } from '$lib/multiplayer/session';
import {
	subscribeConnectionStatus,
	type ConnectionStatus,
} from '$lib/multiplayer/connection';
import type { Unsubscribe } from 'firebase/database';

/**
 * Hint for form pre-fill when reconnection fails.
 */
interface SessionHint {
	playerName: string;
	lobbyCode: string;
}

/**
 * Lobby store state.
 */
interface LobbyState {
	initialized: boolean;
	session: LocalSession | null;
	lobby: Lobby | null;
	connectionStatus: ConnectionStatus;
	error: string | null;
	lastSessionHint: SessionHint | null;
}

function createLobbyStore() {
	let state = $state<LobbyState>({
		initialized: false,
		session: null,
		lobby: null,
		connectionStatus: 'connecting',
		error: null,
		lastSessionHint: null,
	});

	let lobbyUnsubscribe: Unsubscribe | null = null;
	let connectionUnsubscribe: Unsubscribe | null = null;

	/**
	 * Initialize the store - call once on app start.
	 * Returns true if successfully rejoined a lobby.
	 */
	async function initialize(): Promise<boolean> {
		if (state.initialized) {
			return state.session !== null && state.lobby !== null;
		}

		// Initialize Firebase
		initFirebase();

		// Subscribe to connection status
		connectionUnsubscribe = subscribeConnectionStatus((status) => {
			state.connectionStatus = status;

			// If reconnecting and we have a session, mark as connected
			if (status === 'connected' && state.session) {
				markConnected(state.session.lobbyCode, state.session.playerId).catch(
					console.error
				);
			}
		});

		// Try to restore session
		const savedSession = loadSession();
		let success = false;
		if (savedSession) {
			// Attempt to rejoin the lobby
			success = await rejoinLobby(savedSession);
		}

		state.initialized = true;
		return success;
	}

	/**
	 * Attempt to rejoin a lobby from a saved session.
	 * Returns true if successfully rejoined, false otherwise.
	 */
	async function rejoinLobby(session: LocalSession): Promise<boolean> {
		try {
			// First, verify lobby exists and player is still in it
			const lobby = await getLobby(session.lobbyCode);
			if (!lobby) {
				clearSession();
				state.lastSessionHint = {
					playerName: session.playerName,
					lobbyCode: session.lobbyCode,
				};
				state.error = 'Lobby no longer exists';
				return false;
			}

			if (!lobby.players[session.playerId]) {
				clearSession();
				state.lastSessionHint = {
					playerName: session.playerName,
					lobbyCode: session.lobbyCode,
				};
				state.error = 'Session expired. Rejoin with the same name to reclaim your seat.';
				return false;
			}

			// Set session and lobby FIRST before subscribing
			state.session = session;
			state.lobby = lobby;
			state.error = null;

			// Subscribe to lobby updates
			lobbyUnsubscribe = subscribeLobby(session.lobbyCode, (lobbyUpdate) => {
				if (!lobbyUpdate) {
					clearSession();
					state.session = null;
					state.lobby = null;
					return;
				}
				state.lobby = lobbyUpdate;
			});

			// Mark as connected and re-setup disconnect handler
			await markConnected(session.lobbyCode, session.playerId);
			return true;
		} catch (err) {
			console.error('Failed to rejoin lobby:', err);
			clearSession();
			state.lastSessionHint = {
				playerName: session.playerName,
				lobbyCode: session.lobbyCode,
			};
			state.error = 'Failed to rejoin lobby';
			return false;
		}
	}

	/**
	 * Create a new lobby as host.
	 */
	async function hostGame(playerName: string) {
		try {
			state.error = null;
			const session = await createLobby(playerName);
			saveSession(session);
			state.session = session;

			// Subscribe to lobby updates
			lobbyUnsubscribe = subscribeLobby(session.lobbyCode, (lobby) => {
				state.lobby = lobby;
			});
		} catch (err) {
			state.error = err instanceof Error ? err.message : 'Failed to create lobby';
			throw err;
		}
	}

	/**
	 * Join an existing lobby.
	 */
	async function joinGame(code: string, playerName: string, seat?: Seat) {
		try {
			state.error = null;
			const session = await joinLobby(code, playerName, seat);
			saveSession(session);
			state.session = session;

			// Subscribe to lobby updates
			lobbyUnsubscribe = subscribeLobby(session.lobbyCode, (lobby) => {
				state.lobby = lobby;
			});
		} catch (err) {
			state.error = err instanceof Error ? err.message : 'Failed to join lobby';
			throw err;
		}
	}

	/**
	 * Leave the current lobby.
	 */
	async function leaveGame() {
		if (!state.session) return;

		try {
			await leaveLobby(state.session.lobbyCode, state.session.playerId);
		} catch (err) {
			console.error('Failed to leave lobby:', err);
		}

		// Clean up
		if (lobbyUnsubscribe) {
			lobbyUnsubscribe();
			lobbyUnsubscribe = null;
		}
		clearSession();
		state.session = null;
		state.lobby = null;
		state.error = null;
	}

	/**
	 * Change to a different seat.
	 */
	async function selectSeat(seat: Seat) {
		if (!state.session) {
			throw new Error('Not in a lobby');
		}

		try {
			state.error = null;
			await changeSeat(state.session.lobbyCode, state.session.playerId, seat);
		} catch (err) {
			state.error = err instanceof Error ? err.message : 'Failed to change seat';
			throw err;
		}
	}

	/**
	 * Clear any error message.
	 */
	function clearError() {
		state.error = null;
	}

	/**
	 * Clean up subscriptions.
	 */
	function destroy() {
		if (lobbyUnsubscribe) {
			lobbyUnsubscribe();
			lobbyUnsubscribe = null;
		}
		if (connectionUnsubscribe) {
			connectionUnsubscribe();
			connectionUnsubscribe = null;
		}
	}

	return {
		// Getters for reactive state
		get initialized() {
			return state.initialized;
		},
		get session() {
			return state.session;
		},
		get lobby() {
			return state.lobby;
		},
		get connectionStatus() {
			return state.connectionStatus;
		},
		get error() {
			return state.error;
		},
		get lastSessionHint() {
			return state.lastSessionHint;
		},

		// Derived state
		get isHost() {
			return state.session && state.lobby
				? state.lobby.host === state.session.playerId
				: false;
		},
		get mySeat() {
			if (!state.session || !state.lobby) return null;
			return state.lobby.players[state.session.playerId]?.seat ?? null;
		},
		get canStartGame() {
			return state.lobby ? isLobbyFull(state.lobby) : false;
		},
		get players() {
			return state.lobby ? getPlayersBySeat(state.lobby) : [];
		},
		get isConnected() {
			return state.connectionStatus === 'connected';
		},
		get isInLobby() {
			return state.session !== null && state.lobby !== null;
		},

		// Actions
		initialize,
		hostGame,
		joinGame,
		leaveGame,
		selectSeat,
		clearError,
		destroy,
	};
}

// Export a singleton instance
export const lobbyStore = createLobbyStore();
