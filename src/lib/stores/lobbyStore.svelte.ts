import type { Lobby, ConnectionState, PlayerSeat, Seat } from '$lib/multiplayer/types';
import { canStartGame } from '$lib/multiplayer/lobby';
import {
	createLobby,
	joinLobby,
	leaveLobby,
	changeSeat,
	startGame,
	subscribeLobby,
	reconnect,
	clearSession,
	getSession
} from '$lib/multiplayer/lobbyService';
import type { Unsubscribe } from 'firebase/database';

class LobbyStore {
	// Reactive state
	lobby = $state<Lobby | null>(null);
	playerId = $state<string | null>(null);
	connectionState = $state<ConnectionState>('initial');
	error = $state<string | null>(null);

	// Derived state
	isHost = $derived(this.lobby?.host === this.playerId);
	currentPlayer = $derived(
		this.playerId && this.lobby?.players ? this.lobby.players[this.playerId] : null
	);
	canStart = $derived(this.lobby ? canStartGame(this.lobby.players || {}) : false);
	isInLobby = $derived(this.lobby !== null && this.playerId !== null);
	playerCount = $derived(
		this.lobby?.players
			? Object.values(this.lobby.players).filter((p) => p.seat !== 'table').length
			: 0
	);

	private unsubscribe: Unsubscribe | null = null;

	/**
	 * Creates a new lobby and joins as host.
	 */
	async create(playerName: string): Promise<boolean> {
		this.error = null;
		this.connectionState = 'connecting';

		const result = await createLobby(playerName);

		if (result.success && result.lobbyCode && result.playerId) {
			this.playerId = result.playerId;
			this.subscribeToLobby(result.lobbyCode);
			return true;
		} else {
			this.error = result.error || 'Onbekende fout';
			this.connectionState = 'error';
			return false;
		}
	}

	/**
	 * Joins an existing lobby.
	 */
	async join(lobbyCode: string, playerName: string, seat?: Seat): Promise<boolean> {
		this.error = null;
		this.connectionState = 'connecting';

		const result = await joinLobby(lobbyCode, playerName, seat);

		if (result.success && result.playerId) {
			this.playerId = result.playerId;
			this.subscribeToLobby(lobbyCode);
			return true;
		} else {
			this.error = result.error || 'Onbekende fout';
			this.connectionState = 'error';
			return false;
		}
	}

	/**
	 * Leaves the current lobby.
	 */
	async leave(): Promise<void> {
		if (this.lobby && this.playerId) {
			await leaveLobby(this.lobby.code, this.playerId);
		}
		this.cleanup();
	}

	/**
	 * Changes to a different seat.
	 */
	async switchSeat(newSeat: Seat): Promise<boolean> {
		if (!this.lobby || !this.playerId) {
			this.error = 'Niet verbonden met lobby';
			return false;
		}

		const result = await changeSeat(this.lobby.code, this.playerId, newSeat);

		if (!result.success) {
			this.error = result.error || 'Kon niet van stoel wisselen';
			return false;
		}

		return true;
	}

	/**
	 * Starts the game (host only).
	 */
	async start(): Promise<boolean> {
		if (!this.lobby || !this.playerId) {
			this.error = 'Niet verbonden met lobby';
			return false;
		}

		const result = await startGame(this.lobby.code, this.playerId);

		if (!result.success) {
			this.error = result.error || 'Kon spel niet starten';
			return false;
		}

		return true;
	}

	/**
	 * Attempts to reconnect to a previous session.
	 */
	async tryReconnect(): Promise<boolean> {
		const session = getSession();
		if (!session) {
			return false;
		}

		this.connectionState = 'reconnecting';

		const result = await reconnect();

		if (result.success && result.lobby && result.playerId) {
			this.playerId = result.playerId;
			this.subscribeToLobby(result.lobby.code);
			return true;
		} else {
			this.connectionState = 'initial';
			return false;
		}
	}

	/**
	 * Clears any error state.
	 */
	clearError(): void {
		this.error = null;
	}

	/**
	 * Gets players sorted by seat number.
	 */
	getPlayersBySeat(): Array<{ playerId: string; player: Lobby['players'][string] }> {
		if (!this.lobby?.players) return [];

		return Object.entries(this.lobby.players)
			.map(([playerId, player]) => ({ playerId, player }))
			.sort((a, b) => {
				if (a.player.seat === 'table') return 1;
				if (b.player.seat === 'table') return -1;
				return (a.player.seat as number) - (b.player.seat as number);
			});
	}

	/**
	 * Gets the player at a specific seat.
	 */
	getPlayerAtSeat(
		seat: Seat
	): { playerId: string; player: Lobby['players'][string] } | null {
		if (!this.lobby?.players) return null;

		for (const [playerId, player] of Object.entries(this.lobby.players)) {
			if (player.seat === seat) {
				return { playerId, player };
			}
		}

		return null;
	}

	/**
	 * Subscribes to real-time lobby updates.
	 */
	private subscribeToLobby(lobbyCode: string): void {
		this.unsubscribe?.();

		this.unsubscribe = subscribeLobby(lobbyCode, (lobby) => {
			if (lobby) {
				this.lobby = lobby;
				this.connectionState = 'connected';
			} else {
				// Lobby was deleted
				this.cleanup();
				this.error = 'Lobby bestaat niet meer';
			}
		});
	}

	/**
	 * Cleans up state and subscription.
	 */
	private cleanup(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.lobby = null;
		this.playerId = null;
		this.connectionState = 'initial';
		this.error = null;
		clearSession();
	}
}

// Export singleton instance
export const lobbyStore = new LobbyStore();
