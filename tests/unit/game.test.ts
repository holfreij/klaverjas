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
		expect(game.scores).toEqual({ north_south: 0, west_east: 0 });
	});

	it('should set initial dealer to South (position 0)', () => {
		const game = createGame();
		expect(game.dealer).toBe('south');
	});
});

describe('startRound', () => {
	let game: GameState;

	beforeEach(() => {
		game = createGame();
	});

	it('should deal 8 cards to each player', () => {
		const round = startRound(game);
		expect(round.hands.south).toHaveLength(8);
		expect(round.hands.west).toHaveLength(8);
		expect(round.hands.north).toHaveLength(8);
		expect(round.hands.east).toHaveLength(8);
	});

	it('should set trump chooser to left of dealer (West when dealer is South)', () => {
		const round = startRound(game);
		expect(round.trumpChooser).toBe('west');
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
		game.dealer = 'west';
		const round = startRound(game);
		expect(round.trumpChooser).toBe('north');
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
		// Trump chooser is West (West-East team)
		chooseTrump(game, '♠');
		expect(game.round!.playingTeam).toBe('west_east');
	});

	it('should set first player to trump chooser', () => {
		chooseTrump(game, '♠');
		expect(game.round!.currentPlayer).toBe('west');
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
		const cardToPlay = game.round!.hands.west[0];
		playCard(game, 'west', cardToPlay);
		expect(game.round!.currentTrick).toContainEqual({ player: 'west', card: cardToPlay });
	});

	it('should remove card from player hand', () => {
		const cardToPlay = game.round!.hands.west[0];
		const originalHandSize = game.round!.hands.west.length;
		playCard(game, 'west', cardToPlay);
		expect(game.round!.hands.west).toHaveLength(originalHandSize - 1);
	});

	it('should advance to next player', () => {
		const cardToPlay = game.round!.hands.west[0];
		playCard(game, 'west', cardToPlay);
		expect(game.round!.currentPlayer).toBe('north');
	});

	it('should cycle through all 4 players', () => {
		playCard(game, 'west', game.round!.hands.west[0]);
		expect(game.round!.currentPlayer).toBe('north');

		playCard(game, 'north', game.round!.hands.north[0]);
		expect(game.round!.currentPlayer).toBe('east');

		playCard(game, 'east', game.round!.hands.east[0]);
		expect(game.round!.currentPlayer).toBe('south');
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
			{ player: 'west', card: card('♠', 'K') },
			{ player: 'north', card: card('♠', 'Q') },
			{ player: 'east', card: card('♠', 'J') },
			{ player: 'south', card: card('♥', '7') }
		];

		const result = claimRoem(game, 'west', 40);
		expect(result.valid).toBe(true);
	});

	it('should reject invalid roem claim', () => {
		game.round!.currentTrick = [
			{ player: 'west', card: card('♠', 'K') },
			{ player: 'north', card: card('♠', 'Q') },
			{ player: 'east', card: card('♠', 'J') },
			{ player: 'south', card: card('♥', '7') }
		];

		const result = claimRoem(game, 'west', 20); // Under-claiming
		expect(result.valid).toBe(false);
	});

	it('should track claimed roem for the team', () => {
		game.round!.currentTrick = [
			{ player: 'west', card: card('♠', 'K') },
			{ player: 'north', card: card('♠', 'Q') },
			{ player: 'east', card: card('♠', 'J') },
			{ player: 'south', card: card('♥', '7') }
		];

		claimRoem(game, 'west', 40);
		// West is on west_east team
		expect(game.round!.roem.west_east).toBe(40);
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
			{ player: 'west', card: card('♥', '10') },
			{ player: 'north', card: card('♥', 'A') }, // Winner (highest of led suit)
			{ player: 'east', card: card('♥', 'K') },
			{ player: 'south', card: card('♥', '7') }
		];

		completeTrick(game);
		// A(11) + 10(10) + K(4) + 0 = 25 points
		expect(game.round!.points.north_south).toBe(25);
	});

	it('should set next lead to trick winner', () => {
		game.round!.currentTrick = [
			{ player: 'west', card: card('♥', '10') },
			{ player: 'north', card: card('♥', 'A') },
			{ player: 'east', card: card('♥', 'K') },
			{ player: 'south', card: card('♥', '7') }
		];

		completeTrick(game);
		expect(game.round!.currentPlayer).toBe('north');
	});

	it('should increment trick count', () => {
		game.round!.currentTrick = [
			{ player: 'west', card: card('♥', '10') },
			{ player: 'north', card: card('♥', 'A') },
			{ player: 'east', card: card('♥', 'K') },
			{ player: 'south', card: card('♥', '7') }
		];

		completeTrick(game);
		expect(game.round!.tricksPlayed).toBe(1);
	});

	it('should add last trick bonus on trick 8', () => {
		game.round!.tricksPlayed = 7;
		game.round!.currentTrick = [
			{ player: 'west', card: card('♥', '7') },
			{ player: 'north', card: card('♥', '8') },
			{ player: 'east', card: card('♥', '9') },
			{ player: 'south', card: card('♥', 'A') } // South wins with Ace
		];

		completeTrick(game);
		// A(11) + 0 + 0 + 0 + 10 (last trick) = 21
		// South is on north_south team
		expect(game.round!.points.north_south).toBe(21);
	});

	it('should store hand snapshot for next trick', () => {
		game.round!.currentTrick = [
			{ player: 'west', card: card('♥', '10') },
			{ player: 'north', card: card('♥', 'A') },
			{ player: 'east', card: card('♥', 'K') },
			{ player: 'south', card: card('♥', '7') }
		];

		completeTrick(game);
		expect(game.round!.handSnapshots[1]).toBeDefined();
	});

	it('should track tricks won by team', () => {
		game.round!.currentTrick = [
			{ player: 'west', card: card('♥', '10') },
			{ player: 'north', card: card('♥', 'A') }, // North wins
			{ player: 'east', card: card('♥', 'K') },
			{ player: 'south', card: card('♥', '7') }
		];

		completeTrick(game);
		expect(game.round!.tricksWon.north_south).toBe(1);
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
		game.round!.points = { north_south: 90, west_east: 72 };
		game.round!.tricksWon = { north_south: 5, west_east: 3 };
		game.round!.playingTeam = 'north_south';

		completeRound(game);
		expect(game.scores.north_south).toBe(90);
		expect(game.scores.west_east).toBe(72);
	});

	it('should increment current round', () => {
		game.round!.points = { north_south: 90, west_east: 72 };
		game.round!.tricksWon = { north_south: 5, west_east: 3 };
		game.round!.playingTeam = 'north_south';

		completeRound(game);
		expect(game.currentRound).toBe(1);
	});

	it('should rotate dealer clockwise', () => {
		game.round!.points = { north_south: 90, west_east: 72 };
		game.round!.tricksWon = { north_south: 5, west_east: 3 };
		game.round!.playingTeam = 'north_south';

		completeRound(game);
		expect(game.dealer).toBe('west');
	});

	it('should handle nat (playing team fails)', () => {
		game.round!.points = { north_south: 70, west_east: 92 };
		game.round!.tricksWon = { north_south: 3, west_east: 5 };
		game.round!.playingTeam = 'north_south'; // North-South is playing but only got 70

		completeRound(game);
		expect(game.scores.north_south).toBe(0);
		expect(game.scores.west_east).toBe(162);
	});

	it('should handle pit', () => {
		game.round!.points = { north_south: 0, west_east: 162 };
		game.round!.tricksWon = { north_south: 0, west_east: 8 };
		game.round!.playingTeam = 'west_east';

		completeRound(game);
		expect(game.scores.west_east).toBe(262); // 162 + 100 bonus
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
		game.scores = { north_south: 1500, west_east: 1100 };

		const result = getGameResult(game);
		expect(result.scores).toEqual({ north_south: 1500, west_east: 1100 });
		expect(result.winner).toBe('north_south');
	});

	it('should handle tie (unlikely but possible)', () => {
		const game = createGame();
		game.currentRound = 16;
		game.scores = { north_south: 1300, west_east: 1300 };

		const result = getGameResult(game);
		expect(result.winner).toBeNull();
	});
});

describe('game flow', () => {
	it('should have first dealer as South', () => {
		const game = createGame();
		expect(game.dealer).toBe('south');
	});

	it('should have first trump chooser as West (left of dealer)', () => {
		const game = createGame();
		game.round = startRound(game);
		expect(game.round.trumpChooser).toBe('west');
	});

	it('should rotate dealer: south -> west -> north -> east -> south', () => {
		const game = createGame();

		// Round 1
		game.round = startRound(game);
		chooseTrump(game, '♠');
		game.round.points = { north_south: 82, west_east: 80 };
		game.round.tricksWon = { north_south: 4, west_east: 4 };
		game.round.playingTeam = 'north_south';
		completeRound(game);
		expect(game.dealer).toBe('west');

		// Round 2
		game.round = startRound(game);
		expect(game.round.trumpChooser).toBe('north');
		chooseTrump(game, '♥');
		game.round.points = { north_south: 80, west_east: 82 };
		game.round.tricksWon = { north_south: 4, west_east: 4 };
		game.round.playingTeam = 'north_south';
		completeRound(game);
		expect(game.dealer).toBe('north');

		// Round 3
		game.round = startRound(game);
		expect(game.round.trumpChooser).toBe('east');
	});
});

describe('position helpers', () => {
	it('should correctly identify team for each position', () => {
		const game = createGame();
		game.round = startRound(game);
		chooseTrump(game, '♠');

		// North and South are on the same team
		game.round!.currentTrick = [
			{ player: 'west', card: card('♥', '10') },
			{ player: 'north', card: card('♥', 'A') },
			{ player: 'east', card: card('♥', 'K') },
			{ player: 'south', card: card('♥', '7') }
		];

		completeTrick(game);
		// North won, so north_south team gets the points
		expect(game.round!.tricksWon.north_south).toBe(1);
		expect(game.round!.tricksWon.west_east).toBe(0);
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
			south: [card('♠', '7'), card('♥', 'A')],
			west: [card('♠', '10'), card('♥', 'K')],
			north: [card('♠', 'K'), card('♥', 'Q')],
			east: [card('♠', 'A'), card('♥', 'J')]
		};

		// Store snapshot at start of this trick
		game.round!.handSnapshots[0] = {
			south: [card('♠', '7'), card('♥', 'A')],
			west: [card('♠', '10'), card('♥', 'K')],
			north: [card('♠', 'K'), card('♥', 'Q')],
			east: [card('♠', 'A'), card('♥', 'J')]
		};

		// Play trick where South plays illegally - put in currentTrick
		game.round!.currentTrick = [
			{ player: 'west', card: card('♠', '10') },
			{ player: 'north', card: card('♠', 'K') },
			{ player: 'east', card: card('♠', 'A') },
			{ player: 'south', card: card('♥', 'A') } // Illegal! Has ♠7
		];

		const result = callVerzaakt(game, 'north'); // North calls verzaakt
		expect(result.verzaaktFound).toBe(true);
		expect(result.guiltyPlayer).toBe('south');
		expect(result.guiltyTeam).toBe('north_south');
	});

	it('should reject verzaakt call when no illegal moves', () => {
		game.round!.hands = {
			south: [card('♠', '7'), card('♥', 'A')],
			west: [card('♠', '10'), card('♥', 'K')],
			north: [card('♠', 'K'), card('♥', 'Q')],
			east: [card('♠', 'A'), card('♥', 'J')]
		};

		game.round!.handSnapshots[0] = {
			south: [card('♠', '7'), card('♥', 'A')],
			west: [card('♠', '10'), card('♥', 'K')],
			north: [card('♠', 'K'), card('♥', 'Q')],
			east: [card('♠', 'A'), card('♥', 'J')]
		};

		// All legal plays - in currentTrick
		game.round!.currentTrick = [
			{ player: 'west', card: card('♠', '10') },
			{ player: 'north', card: card('♠', 'K') },
			{ player: 'east', card: card('♠', 'A') },
			{ player: 'south', card: card('♠', '7') }
		];

		const result = callVerzaakt(game, 'east');
		expect(result.verzaaktFound).toBe(false);
	});

	it('should identify first illegal move when multiple exist', () => {
		game.round!.handSnapshots[0] = {
			south: [card('♠', '7'), card('♥', 'A')],
			west: [card('♠', '10'), card('♥', 'K')],
			north: [card('♠', 'K'), card('♥', 'Q')],
			east: [card('♠', 'A'), card('♥', 'J')]
		};

		// Both North and South play illegally, but North first - in currentTrick
		game.round!.currentTrick = [
			{ player: 'west', card: card('♠', '10') },
			{ player: 'north', card: card('♥', 'Q') }, // First illegal! Has ♠K
			{ player: 'east', card: card('♠', 'A') },
			{ player: 'south', card: card('♥', 'A') } // Also illegal but second
		];

		const result = callVerzaakt(game, 'east');
		expect(result.verzaaktFound).toBe(true);
		expect(result.guiltyPlayer).toBe('north'); // North was first
		expect(result.guiltyTeam).toBe('north_south');
	});

	it('should require at least 2 cards in current trick to call verzaakt', () => {
		// Only 1 card played
		game.round!.currentTrick = [{ player: 'west', card: card('♠', '10') }];

		expect(() => callVerzaakt(game, 'north')).toThrow();
	});

	it('should allow verzaakt call after 2 cards played', () => {
		game.round!.handSnapshots[0] = {
			south: [card('♠', '7'), card('♥', 'A')],
			west: [card('♠', '10'), card('♥', 'K')],
			north: [card('♥', 'Q')], // No spades!
			east: [card('♠', 'A'), card('♥', 'J')]
		};

		game.round!.currentTrick = [
			{ player: 'west', card: card('♠', '10') },
			{ player: 'north', card: card('♥', 'Q') } // Legal - has no spades
		];

		// Should not throw
		const result = callVerzaakt(game, 'east');
		expect(result.verzaaktFound).toBe(false);
	});
});
