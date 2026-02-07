import { describe, it, expect, beforeEach } from 'vitest';
import type { Card, Suit } from '$lib/game/deck';
import {
	createGame,
	startRound,
	chooseTrump,
	playCard,
	claimRoem,
	callVerzaakt,
	completeTrick,
	completeRound,
	isGameComplete,
	getGameResult,
	type GameState
} from '$lib/game/game';

const card = (suit: Suit, rank: Card['rank']): Card => ({ suit, rank });

describe('createGame', () => {
	it('should initialize a 16-round game', () => {
		const game = createGame();
		expect(game.totalRounds).toBe(16);
		expect(game.currentRound).toBe(0);
		expect(game.scores).toEqual({ ns: 0, we: 0 });
	});

	it('should set initial dealer to seat 0 (Zuid)', () => {
		const game = createGame();
		expect(game.dealer).toBe(0);
	});
});

describe('startRound', () => {
	let game: GameState;

	beforeEach(() => {
		game = createGame();
	});

	it('should deal 8 cards to each player', () => {
		const round = startRound(game);
		expect(round.hands[0]).toHaveLength(8);
		expect(round.hands[1]).toHaveLength(8);
		expect(round.hands[2]).toHaveLength(8);
		expect(round.hands[3]).toHaveLength(8);
	});

	it('should set trump chooser to left of dealer (seat 1 when dealer is seat 0)', () => {
		const round = startRound(game);
		expect(round.trumpChooser).toBe(1);
	});

	it('should not have trump set yet', () => {
		const round = startRound(game);
		expect(round.trump).toBeNull();
	});

	it('should store hand snapshots for verzaakt checking', () => {
		const round = startRound(game);
		expect(round.handSnapshots).toBeDefined();
		expect(round.handSnapshots[0]).toBeDefined(); // Snapshot for trick 0
	});

	it('should rotate trump chooser with dealer', () => {
		game.dealer = 1;
		const round = startRound(game);
		expect(round.trumpChooser).toBe(2);
	});
});

describe('chooseTrump', () => {
	let game: GameState;

	beforeEach(() => {
		game = createGame();
		game.round = startRound(game);
	});

	it('should set the trump suit', () => {
		chooseTrump(game, '♠');
		expect(game.round!.trump).toBe('♠');
	});

	it('should set the playing team based on trump chooser', () => {
		// Trump chooser is seat 1 (West-East team)
		chooseTrump(game, '♠');
		expect(game.round!.playingTeam).toBe('we');
	});

	it('should set first player to trump chooser', () => {
		chooseTrump(game, '♠');
		expect(game.round!.currentPlayer).toBe(1);
	});
});

describe('playCard', () => {
	let game: GameState;

	beforeEach(() => {
		game = createGame();
		game.round = startRound(game);
		chooseTrump(game, '♠');
	});

	it('should record the played card', () => {
		const cardToPlay = game.round!.hands[1][0];
		playCard(game, 1, cardToPlay);
		expect(game.round!.currentTrick).toContainEqual({ player: 1, card: cardToPlay });
	});

	it('should remove card from player hand', () => {
		const cardToPlay = game.round!.hands[1][0];
		const originalHandSize = game.round!.hands[1].length;
		playCard(game, 1, cardToPlay);
		expect(game.round!.hands[1]).toHaveLength(originalHandSize - 1);
	});

	it('should advance to next player', () => {
		const cardToPlay = game.round!.hands[1][0];
		playCard(game, 1, cardToPlay);
		expect(game.round!.currentPlayer).toBe(2);
	});

	it('should cycle through all 4 players', () => {
		playCard(game, 1, game.round!.hands[1][0]);
		expect(game.round!.currentPlayer).toBe(2);

		playCard(game, 2, game.round!.hands[2][0]);
		expect(game.round!.currentPlayer).toBe(3);

		playCard(game, 3, game.round!.hands[3][0]);
		expect(game.round!.currentPlayer).toBe(0);
	});
});

describe('claimRoem', () => {
	let game: GameState;

	beforeEach(() => {
		game = createGame();
		game.round = startRound(game);
		chooseTrump(game, '♠');
	});

	it('should accept valid roem claim', () => {
		// Set up a trick with roem (K-Q-J of trump = 40 points)
		game.round!.currentTrick = [
			{ player: 1, card: card('♠', 'K') },
			{ player: 2, card: card('♠', 'Q') },
			{ player: 3, card: card('♠', 'J') },
			{ player: 0, card: card('♥', '7') }
		];

		const result = claimRoem(game, 1, 40);
		expect(result.valid).toBe(true);
	});

	it('should reject invalid roem claim', () => {
		game.round!.currentTrick = [
			{ player: 1, card: card('♠', 'K') },
			{ player: 2, card: card('♠', 'Q') },
			{ player: 3, card: card('♠', 'J') },
			{ player: 0, card: card('♥', '7') }
		];

		const result = claimRoem(game, 1, 20); // Under-claiming
		expect(result.valid).toBe(false);
	});

	it('should track claimed roem for the team', () => {
		game.round!.currentTrick = [
			{ player: 1, card: card('♠', 'K') },
			{ player: 2, card: card('♠', 'Q') },
			{ player: 3, card: card('♠', 'J') },
			{ player: 0, card: card('♥', '7') }
		];

		claimRoem(game, 1, 40);
		// Seat 1 is on 'we' team
		expect(game.round!.roem.we).toBe(40);
	});
});

describe('completeTrick', () => {
	let game: GameState;

	beforeEach(() => {
		game = createGame();
		game.round = startRound(game);
		chooseTrump(game, '♠');
	});

	it('should determine trick winner and award points', () => {
		// Force specific cards for testing
		game.round!.currentTrick = [
			{ player: 1, card: card('♥', '10') },
			{ player: 2, card: card('♥', 'A') }, // Winner (highest of led suit)
			{ player: 3, card: card('♥', 'K') },
			{ player: 0, card: card('♥', '7') }
		];

		completeTrick(game);
		// A(11) + 10(10) + K(4) + 0 = 25 points
		expect(game.round!.points.ns).toBe(25);
	});

	it('should set next lead to trick winner', () => {
		game.round!.currentTrick = [
			{ player: 1, card: card('♥', '10') },
			{ player: 2, card: card('♥', 'A') },
			{ player: 3, card: card('♥', 'K') },
			{ player: 0, card: card('♥', '7') }
		];

		completeTrick(game);
		expect(game.round!.currentPlayer).toBe(2);
	});

	it('should increment trick count', () => {
		game.round!.currentTrick = [
			{ player: 1, card: card('♥', '10') },
			{ player: 2, card: card('♥', 'A') },
			{ player: 3, card: card('♥', 'K') },
			{ player: 0, card: card('♥', '7') }
		];

		completeTrick(game);
		expect(game.round!.tricksPlayed).toBe(1);
	});

	it('should add last trick bonus on trick 8', () => {
		game.round!.tricksPlayed = 7;
		game.round!.currentTrick = [
			{ player: 1, card: card('♥', '7') },
			{ player: 2, card: card('♥', '8') },
			{ player: 3, card: card('♥', '9') },
			{ player: 0, card: card('♥', 'A') } // Seat 0 wins with Ace
		];

		completeTrick(game);
		// A(11) + 0 + 0 + 0 + 10 (last trick) = 21
		// Seat 0 is on 'ns' team
		expect(game.round!.points.ns).toBe(21);
	});

	it('should store hand snapshot for next trick', () => {
		game.round!.currentTrick = [
			{ player: 1, card: card('♥', '10') },
			{ player: 2, card: card('♥', 'A') },
			{ player: 3, card: card('♥', 'K') },
			{ player: 0, card: card('♥', '7') }
		];

		completeTrick(game);
		expect(game.round!.handSnapshots[1]).toBeDefined();
	});

	it('should track tricks won by team', () => {
		game.round!.currentTrick = [
			{ player: 1, card: card('♥', '10') },
			{ player: 2, card: card('♥', 'A') }, // Seat 2 wins
			{ player: 3, card: card('♥', 'K') },
			{ player: 0, card: card('♥', '7') }
		];

		completeTrick(game);
		expect(game.round!.tricksWon.ns).toBe(1);
	});
});

describe('completeRound', () => {
	let game: GameState;

	beforeEach(() => {
		game = createGame();
		game.round = startRound(game);
		chooseTrump(game, '♠');
	});

	it('should add round scores to game scores', () => {
		game.round!.points = { ns: 90, we: 72 };
		game.round!.tricksWon = { ns: 5, we: 3 };
		game.round!.playingTeam = 'ns';

		completeRound(game);
		expect(game.scores.ns).toBe(90);
		expect(game.scores.we).toBe(72);
	});

	it('should increment current round', () => {
		game.round!.points = { ns: 90, we: 72 };
		game.round!.tricksWon = { ns: 5, we: 3 };
		game.round!.playingTeam = 'ns';

		completeRound(game);
		expect(game.currentRound).toBe(1);
	});

	it('should rotate dealer clockwise', () => {
		game.round!.points = { ns: 90, we: 72 };
		game.round!.tricksWon = { ns: 5, we: 3 };
		game.round!.playingTeam = 'ns';

		completeRound(game);
		expect(game.dealer).toBe(1);
	});

	it('should handle nat (playing team fails)', () => {
		game.round!.points = { ns: 70, we: 92 };
		game.round!.tricksWon = { ns: 3, we: 5 };
		game.round!.playingTeam = 'ns'; // NS is playing but only got 70

		completeRound(game);
		expect(game.scores.ns).toBe(0);
		expect(game.scores.we).toBe(162);
	});

	it('should handle pit', () => {
		game.round!.points = { ns: 0, we: 162 };
		game.round!.tricksWon = { ns: 0, we: 8 };
		game.round!.playingTeam = 'we';

		completeRound(game);
		expect(game.scores.we).toBe(262); // 162 + 100 bonus
	});
});

describe('isGameComplete', () => {
	it('should return false before 16 rounds', () => {
		const game = createGame();
		game.currentRound = 15;
		expect(isGameComplete(game)).toBe(false);
	});

	it('should return true after 16 rounds', () => {
		const game = createGame();
		game.currentRound = 16;
		expect(isGameComplete(game)).toBe(true);
	});
});

describe('getGameResult', () => {
	it('should return final scores and winner', () => {
		const game = createGame();
		game.currentRound = 16;
		game.scores = { ns: 1500, we: 1100 };

		const result = getGameResult(game);
		expect(result.scores).toEqual({ ns: 1500, we: 1100 });
		expect(result.winner).toBe('ns');
	});

	it('should handle tie (unlikely but possible)', () => {
		const game = createGame();
		game.currentRound = 16;
		game.scores = { ns: 1300, we: 1300 };

		const result = getGameResult(game);
		expect(result.winner).toBeNull();
	});
});

describe('game flow', () => {
	it('should have first dealer as seat 0', () => {
		const game = createGame();
		expect(game.dealer).toBe(0);
	});

	it('should have first trump chooser as seat 1 (left of dealer)', () => {
		const game = createGame();
		game.round = startRound(game);
		expect(game.round.trumpChooser).toBe(1);
	});

	it('should rotate dealer: 0 -> 1 -> 2 -> 3 -> 0', () => {
		const game = createGame();

		// Round 1
		game.round = startRound(game);
		chooseTrump(game, '♠');
		game.round.points = { ns: 82, we: 80 };
		game.round.tricksWon = { ns: 4, we: 4 };
		game.round.playingTeam = 'ns';
		completeRound(game);
		expect(game.dealer).toBe(1);

		// Round 2
		game.round = startRound(game);
		expect(game.round.trumpChooser).toBe(2);
		chooseTrump(game, '♥');
		game.round.points = { ns: 80, we: 82 };
		game.round.tricksWon = { ns: 4, we: 4 };
		game.round.playingTeam = 'ns';
		completeRound(game);
		expect(game.dealer).toBe(2);

		// Round 3
		game.round = startRound(game);
		expect(game.round.trumpChooser).toBe(3);
	});
});

describe('position helpers', () => {
	it('should correctly identify team for each seat', () => {
		const game = createGame();
		game.round = startRound(game);
		chooseTrump(game, '♠');

		// Seats 0 and 2 are on the same team (ns)
		game.round!.currentTrick = [
			{ player: 1, card: card('♥', '10') },
			{ player: 2, card: card('♥', 'A') },
			{ player: 3, card: card('♥', 'K') },
			{ player: 0, card: card('♥', '7') }
		];

		completeTrick(game);
		// Seat 2 won, so ns team gets the points
		expect(game.round!.tricksWon.ns).toBe(1);
		expect(game.round!.tricksWon.we).toBe(0);
	});
});

describe('callVerzaakt', () => {
	let game: GameState;

	beforeEach(() => {
		game = createGame();
		game.round = startRound(game);
		chooseTrump(game, '♠');
	});

	it('should detect verzaakt when player did not follow suit', () => {
		// Force specific hands for testing
		game.round!.hands = {
			0: [card('♠', '7'), card('♥', 'A')],
			1: [card('♠', '10'), card('♥', 'K')],
			2: [card('♠', 'K'), card('♥', 'Q')],
			3: [card('♠', 'A'), card('♥', 'J')]
		};

		// Store snapshot at start of this trick
		game.round!.handSnapshots[0] = {
			0: [card('♠', '7'), card('♥', 'A')],
			1: [card('♠', '10'), card('♥', 'K')],
			2: [card('♠', 'K'), card('♥', 'Q')],
			3: [card('♠', 'A'), card('♥', 'J')]
		};

		// Play trick where seat 0 plays illegally - put in currentTrick
		game.round!.currentTrick = [
			{ player: 1, card: card('♠', '10') },
			{ player: 2, card: card('♠', 'K') },
			{ player: 3, card: card('♠', 'A') },
			{ player: 0, card: card('♥', 'A') } // Illegal! Has ♠7
		];

		const result = callVerzaakt(game, 2); // Seat 2 calls verzaakt
		expect(result.verzaaktFound).toBe(true);
		expect(result.guiltyPlayer).toBe(0);
		expect(result.guiltyTeam).toBe('ns');
	});

	it('should reject verzaakt call when no illegal moves', () => {
		game.round!.hands = {
			0: [card('♠', '7'), card('♥', 'A')],
			1: [card('♠', '10'), card('♥', 'K')],
			2: [card('♠', 'K'), card('♥', 'Q')],
			3: [card('♠', 'A'), card('♥', 'J')]
		};

		game.round!.handSnapshots[0] = {
			0: [card('♠', '7'), card('♥', 'A')],
			1: [card('♠', '10'), card('♥', 'K')],
			2: [card('♠', 'K'), card('♥', 'Q')],
			3: [card('♠', 'A'), card('♥', 'J')]
		};

		// All legal plays - in currentTrick
		game.round!.currentTrick = [
			{ player: 1, card: card('♠', '10') },
			{ player: 2, card: card('♠', 'K') },
			{ player: 3, card: card('♠', 'A') },
			{ player: 0, card: card('♠', '7') }
		];

		const result = callVerzaakt(game, 3);
		expect(result.verzaaktFound).toBe(false);
	});

	it('should identify first illegal move when multiple exist', () => {
		game.round!.handSnapshots[0] = {
			0: [card('♠', '7'), card('♥', 'A')],
			1: [card('♠', '10'), card('♥', 'K')],
			2: [card('♠', 'K'), card('♥', 'Q')],
			3: [card('♠', 'A'), card('♥', 'J')]
		};

		// Both seat 2 and seat 0 play illegally, but seat 2 first - in currentTrick
		game.round!.currentTrick = [
			{ player: 1, card: card('♠', '10') },
			{ player: 2, card: card('♥', 'Q') }, // First illegal! Has ♠K
			{ player: 3, card: card('♠', 'A') },
			{ player: 0, card: card('♥', 'A') } // Also illegal but second
		];

		const result = callVerzaakt(game, 3);
		expect(result.verzaaktFound).toBe(true);
		expect(result.guiltyPlayer).toBe(2); // Seat 2 was first
		expect(result.guiltyTeam).toBe('ns');
	});

	it('should require at least 2 cards in current trick to call verzaakt', () => {
		// Only 1 card played
		game.round!.currentTrick = [{ player: 1, card: card('♠', '10') }];

		expect(() => callVerzaakt(game, 2)).toThrow();
	});

	it('should allow verzaakt call after 2 cards played', () => {
		game.round!.handSnapshots[0] = {
			0: [card('♠', '7'), card('♥', 'A')],
			1: [card('♠', '10'), card('♥', 'K')],
			2: [card('♥', 'Q')], // No spades!
			3: [card('♠', 'A'), card('♥', 'J')]
		};

		game.round!.currentTrick = [
			{ player: 1, card: card('♠', '10') },
			{ player: 2, card: card('♥', 'Q') } // Legal - has no spades
		];

		// Should not throw
		const result = callVerzaakt(game, 3);
		expect(result.verzaaktFound).toBe(false);
	});
});
