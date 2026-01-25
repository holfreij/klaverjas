/**
 * Game store using Svelte 5 runes.
 * Wraps the game engine and provides reactive state management.
 */

import type { Card, Suit } from '$lib/game/deck';
import type { GameState } from '$lib/game/game';
import { createGame, chooseTrump, playCard } from '$lib/game/game';
import { getLegalMoves } from '$lib/game/rules';

class GameStore {
	state = $state<GameState>(createGame());

	// Derived state
	get currentPlayerHand(): Card[] {
		return this.state.hands[this.state.currentPlayer] ?? [];
	}

	get legalMoves(): Card[] {
		if (this.state.phase !== 'playing' || !this.state.trump) {
			return [];
		}
		return getLegalMoves(
			this.currentPlayerHand,
			this.state.currentTrick,
			this.state.trump
		);
	}

	get isGameOver(): boolean {
		return this.state.phase === 'finished';
	}

	get isTrumpPhase(): boolean {
		return this.state.phase === 'trump';
	}

	get isPlayingPhase(): boolean {
		return this.state.phase === 'playing';
	}

	// Actions
	newGame() {
		this.state = createGame();
	}

	selectTrump(suit: Suit) {
		if (this.state.phase !== 'trump') {
			console.error('Cannot select trump: not in trump phase');
			return;
		}
		this.state = chooseTrump(this.state, suit);
	}

	play(card: Card) {
		if (this.state.phase !== 'playing') {
			console.error('Cannot play card: not in playing phase');
			return;
		}
		try {
			this.state = playCard(this.state, card);
		} catch (error) {
			console.error('Failed to play card:', error);
		}
	}

	// Get legal moves for any player (for god mode)
	getLegalMovesForPlayer(player: number): Card[] {
		if (this.state.phase !== 'playing' || !this.state.trump) {
			return [];
		}
		const hand = this.state.hands[player] ?? [];
		return getLegalMoves(hand, this.state.currentTrick, this.state.trump);
	}
}

// Export a singleton instance
export const gameStore = new GameStore();
