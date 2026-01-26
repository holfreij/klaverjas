/**
 * Multiplayer game store using Svelte 5 runes.
 * Manages game state synchronized via Firebase.
 */

import type { Card, Suit } from '$lib/game/deck';
import type { RoemClaim } from '$lib/game/roem';
import type { MultiplayerGameState, Seat } from '$lib/multiplayer/types';
import {
	startGame,
	selectTrump,
	playCardMultiplayer,
	claimRoemMultiplayer,
	subscribeGame,
	requestRematch,
	isPlayerTurn as checkIsPlayerTurn,
	getHandForSeat,
	getLegalMovesForPlayer,
} from '$lib/multiplayer/game';
import { lobbyStore } from './lobbyStore.svelte';
import type { Unsubscribe } from 'firebase/database';

/**
 * Multiplayer game store state.
 */
interface MultiplayerGameStoreState {
	game: MultiplayerGameState | null;
	error: string | null;
	isLoading: boolean;
}

function createMultiplayerGameStore() {
	let state = $state<MultiplayerGameStoreState>({
		game: null,
		error: null,
		isLoading: false,
	});

	let gameUnsubscribe: Unsubscribe | null = null;

	/**
	 * Subscribe to game state updates for the current lobby.
	 */
	function subscribeToGame(lobbyCode: string) {
		// Unsubscribe from previous game if any
		if (gameUnsubscribe) {
			gameUnsubscribe();
		}

		gameUnsubscribe = subscribeGame(lobbyCode, (game) => {
			state.game = game;
			state.isLoading = false;
		});
	}

	/**
	 * Start a new game in the current lobby.
	 * Only the host should call this.
	 */
	async function start() {
		const session = lobbyStore.session;
		if (!session) {
			state.error = 'Not in a lobby';
			return;
		}

		try {
			state.isLoading = true;
			state.error = null;
			await startGame(session.lobbyCode);
			// Game state will be updated via subscription
		} catch (err) {
			state.error = err instanceof Error ? err.message : 'Failed to start game';
			state.isLoading = false;
			throw err;
		}
	}

	/**
	 * Select trump suit.
	 */
	async function chooseTrump(trump: Suit) {
		const session = lobbyStore.session;
		if (!session) {
			state.error = 'Not in a lobby';
			return;
		}

		try {
			state.error = null;
			await selectTrump(session.lobbyCode, session.playerId, trump);
		} catch (err) {
			state.error = err instanceof Error ? err.message : 'Failed to select trump';
			throw err;
		}
	}

	/**
	 * Play a card.
	 */
	async function playCard(card: Card) {
		const session = lobbyStore.session;
		if (!session) {
			state.error = 'Not in a lobby';
			return;
		}

		try {
			state.error = null;
			await playCardMultiplayer(session.lobbyCode, session.playerId, card);
		} catch (err) {
			state.error = err instanceof Error ? err.message : 'Failed to play card';
			throw err;
		}
	}

	/**
	 * Claim roem.
	 */
	async function claimRoem(claim: RoemClaim) {
		const session = lobbyStore.session;
		if (!session) {
			state.error = 'Not in a lobby';
			return;
		}

		try {
			state.error = null;
			await claimRoemMultiplayer(session.lobbyCode, session.playerId, claim);
		} catch (err) {
			state.error = err instanceof Error ? err.message : 'Failed to claim roem';
			throw err;
		}
	}

	/**
	 * Request a rematch after game ends.
	 */
	async function rematch() {
		const session = lobbyStore.session;
		if (!session) {
			state.error = 'Not in a lobby';
			return;
		}

		try {
			state.error = null;
			await requestRematch(session.lobbyCode);
		} catch (err) {
			state.error = err instanceof Error ? err.message : 'Failed to request rematch';
			throw err;
		}
	}

	/**
	 * Clear error message.
	 */
	function clearError() {
		state.error = null;
	}

	/**
	 * Clean up subscriptions.
	 */
	function destroy() {
		if (gameUnsubscribe) {
			gameUnsubscribe();
			gameUnsubscribe = null;
		}
		state.game = null;
	}

	return {
		// Getters for reactive state
		get game() {
			return state.game;
		},
		get error() {
			return state.error;
		},
		get isLoading() {
			return state.isLoading;
		},

		// Derived state
		get mySeat(): number | null {
			const seat = lobbyStore.mySeat;
			return typeof seat === 'number' ? seat : null;
		},

		get myHand(): Card[] {
			const seat = this.mySeat;
			if (seat === null) return [];
			return getHandForSeat(state.game, seat);
		},

		get myLegalMoves(): Card[] {
			const seat = this.mySeat;
			if (seat === null) return [];
			return getLegalMovesForPlayer(state.game, seat);
		},

		get isMyTurn(): boolean {
			return checkIsPlayerTurn(state.game, this.mySeat);
		},

		get isTrumpPhase(): boolean {
			return state.game?.phase === 'trump';
		},

		get isPlayingPhase(): boolean {
			return state.game?.phase === 'playing';
		},

		get isRoundEnd(): boolean {
			return state.game?.phase === 'roundEnd';
		},

		get isGameOver(): boolean {
			// Game is over when we reach roundEnd after 16 rounds
			return state.game?.phase === 'roundEnd' && state.game?.round >= 16;
		},

		get currentPlayer(): number | null {
			return state.game?.currentPlayer ?? null;
		},

		get trump(): Suit | null {
			return state.game?.trump ?? null;
		},

		get playingTeam(): 'NS' | 'WE' | null {
			return state.game?.playingTeam ?? null;
		},

		get currentTrick() {
			return state.game?.currentTrick ?? [];
		},

		get completedTricks() {
			return state.game?.completedTricks ?? [];
		},

		get scores() {
			return state.game?.scores ?? { NS: 0, WE: 0 };
		},

		get round(): number {
			return state.game?.round ?? 0;
		},

		get dealer(): number {
			return state.game?.dealer ?? 0;
		},

		get roemClaims() {
			return state.game?.roemClaims ?? [];
		},

		/**
		 * Get the number of cards in a player's hand (for display).
		 */
		getHandCount(seat: number): number {
			return getHandForSeat(state.game, seat).length;
		},

		/**
		 * Check if a card is a legal move for the current player.
		 */
		isLegalMove(card: Card): boolean {
			return this.myLegalMoves.some(
				(c) => c.suit === card.suit && c.rank === card.rank
			);
		},

		// Actions
		subscribeToGame,
		start,
		chooseTrump,
		playCard,
		claimRoem,
		rematch,
		clearError,
		destroy,
	};
}

// Export a singleton instance
export const multiplayerGameStore = createMultiplayerGameStore();
