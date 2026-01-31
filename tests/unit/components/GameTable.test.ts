import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import GameTable from '$lib/components/GameTable.svelte';
import type { GameState, PlayerSeat, Player } from '$lib/multiplayer/types';

// Helper to create a minimal game state for testing
function createTestGameState(overrides: Partial<GameState> = {}): GameState {
	return {
		phase: 'playing',
		round: 1,
		trick: 1,
		dealer: 0,
		trump: '♥',
		trumpChooser: 0,
		playingTeam: 'ns',
		currentPlayer: 0,
		handsAtTrickStart: {
			0: [],
			1: [],
			2: [],
			3: []
		},
		hands: {
			0: [
				{ suit: '♠', rank: 'A' },
				{ suit: '♥', rank: 'K' }
			],
			1: [
				{ suit: '♣', rank: 'Q' },
				{ suit: '♦', rank: 'J' }
			],
			2: [
				{ suit: '♠', rank: '10' },
				{ suit: '♥', rank: '9' }
			],
			3: [
				{ suit: '♣', rank: '8' },
				{ suit: '♦', rank: '7' }
			]
		},
		currentTrick: [],
		completedTricks: [],
		scores: {
			ns: { base: 0, roem: 0 },
			we: { base: 0, roem: 0 }
		},
		gameScores: {
			ns: 0,
			we: 0
		},
		roemClaimed: false,
		roemClaimPending: null,
		skipVotes: [],
		...overrides
	};
}

// Helper to create test players
function createTestPlayers(): Record<string, Player> {
	return {
		player0: { name: 'Jan', seat: 0, connected: true, lastSeen: Date.now() },
		player1: { name: 'Piet', seat: 1, connected: true, lastSeen: Date.now() },
		player2: { name: 'Klaas', seat: 2, connected: true, lastSeen: Date.now() },
		player3: { name: 'Marie', seat: 3, connected: true, lastSeen: Date.now() }
	};
}

describe('GameTable', () => {
	const defaultProps = {
		gameState: createTestGameState(),
		mySeat: 0 as PlayerSeat,
		myPlayerId: 'player0',
		players: createTestPlayers(),
		tableDeviceJoined: false,
		onCardPlay: vi.fn()
	};

	describe('player positions', () => {
		it('should show player hand at bottom', () => {
			render(GameTable, { props: defaultProps });

			// Hand component should be in the document
			expect(screen.getByRole('region', { name: /jouw kaarten/i })).toBeInTheDocument();
		});

		it('should show partner name at top', () => {
			render(GameTable, { props: defaultProps });

			// From seat 0, partner is seat 2 (Klaas)
			expect(screen.getByTestId('player-top')).toHaveTextContent('Klaas');
		});

		it('should show left opponent name at left', () => {
			render(GameTable, { props: defaultProps });

			// From seat 0, left is seat 1 (Piet)
			expect(screen.getByTestId('player-left')).toHaveTextContent('Piet');
		});

		it('should show right opponent name at right', () => {
			render(GameTable, { props: defaultProps });

			// From seat 0, right is seat 3 (Marie)
			expect(screen.getByTestId('player-right')).toHaveTextContent('Marie');
		});

		it('should show correct positions from different seat', () => {
			render(GameTable, {
				props: {
					...defaultProps,
					mySeat: 2, // Playing as Klaas
					myPlayerId: 'player2'
				}
			});

			// From seat 2: partner is 0 (Jan), left is 3 (Marie), right is 1 (Piet)
			expect(screen.getByTestId('player-top')).toHaveTextContent('Jan');
			expect(screen.getByTestId('player-left')).toHaveTextContent('Marie');
			expect(screen.getByTestId('player-right')).toHaveTextContent('Piet');
		});
	});

	describe('team names in score header', () => {
		it('should show NS team names instead of NZ', () => {
			render(GameTable, { props: defaultProps });

			const scoreHeader = screen.getByTestId('score-header');
			// Jan (seat 0) & Klaas (seat 2) are NS team
			expect(scoreHeader).toHaveTextContent('Jan & Klaas');
		});

		it('should show WE team names instead of WO', () => {
			render(GameTable, { props: defaultProps });

			const scoreHeader = screen.getByTestId('score-header');
			// Piet (seat 1) & Marie (seat 3) are WE team
			expect(scoreHeader).toHaveTextContent('Piet & Marie');
		});

		it('should truncate long names to 20 characters', () => {
			const playersWithLongNames: Record<string, Player> = {
				player0: {
					name: 'JanVanDeGroteNederlandseFamilie',
					seat: 0 as PlayerSeat,
					connected: true,
					lastSeen: Date.now()
				},
				player1: { name: 'Piet', seat: 1 as PlayerSeat, connected: true, lastSeen: Date.now() },
				player2: { name: 'Klaas', seat: 2 as PlayerSeat, connected: true, lastSeen: Date.now() },
				player3: { name: 'Marie', seat: 3 as PlayerSeat, connected: true, lastSeen: Date.now() }
			};
			render(GameTable, { props: { ...defaultProps, players: playersWithLongNames } });

			const scoreHeader = screen.getByTestId('score-header');
			// Name should be truncated with ellipsis
			expect(scoreHeader).toHaveTextContent('JanVanDeGroteNederla…');
		});
	});

	describe('trump indicator', () => {
		it('should show trump suit symbol', () => {
			render(GameTable, { props: defaultProps });

			const trumpIndicator = screen.getByTestId('trump-indicator');
			expect(trumpIndicator).toHaveTextContent('♥');
		});

		it('should not show trump indicator before trump is chosen', () => {
			const gameState = createTestGameState({ trump: null, phase: 'trump' });
			render(GameTable, { props: { ...defaultProps, gameState } });

			expect(screen.queryByTestId('trump-indicator')).not.toBeInTheDocument();
		});
	});

	describe('active player indicator', () => {
		it('should highlight current player position', () => {
			render(GameTable, { props: defaultProps }); // currentPlayer is 0 (self)

			// When it's your turn, the bottom area containing the hand should have the active indicator
			// The hand is nested inside a flex container inside the bottom area
			const handArea = screen.getByRole('region', { name: /jouw kaarten/i });
			// Go up the DOM to find the element with the ring class
			const bottomArea = handArea.closest('.ring-amber-400');
			expect(bottomArea).not.toBeNull();
		});

		it('should highlight partner when it is their turn', () => {
			const gameState = createTestGameState({ currentPlayer: 2 });
			render(GameTable, { props: { ...defaultProps, gameState } });

			const partnerArea = screen.getByTestId('player-top');
			expect(partnerArea).toHaveClass('ring-amber-400');
		});

		it('should highlight left opponent when it is their turn', () => {
			const gameState = createTestGameState({ currentPlayer: 1 });
			render(GameTable, { props: { ...defaultProps, gameState } });

			const leftArea = screen.getByTestId('player-left');
			expect(leftArea).toHaveClass('ring-amber-400');
		});
	});

	describe('trick area', () => {
		it('should show trick area when table device is not joined', () => {
			render(GameTable, { props: defaultProps });

			expect(screen.getByTestId('trick-area')).toBeInTheDocument();
		});

		it('should hide trick area when table device is joined', () => {
			render(GameTable, { props: { ...defaultProps, tableDeviceJoined: true } });

			expect(screen.queryByTestId('trick-area')).not.toBeInTheDocument();
		});

		it('should show played cards in trick area', () => {
			const gameState = createTestGameState({
				currentTrick: [
					{ card: { suit: '♠', rank: 'A' }, seat: 0 },
					{ card: { suit: '♠', rank: 'K' }, seat: 1 }
				]
			});
			render(GameTable, { props: { ...defaultProps, gameState } });

			// Should show 2 cards in the trick area
			const trickArea = screen.getByTestId('trick-area');
			const cards = trickArea.querySelectorAll('[data-testid="card"]');
			expect(cards).toHaveLength(2);
		});
	});

	describe('score header', () => {
		it('should show team scores', () => {
			const gameState = createTestGameState({
				gameScores: { ns: 120, we: 80 }
			});
			render(GameTable, { props: { ...defaultProps, gameState } });

			expect(screen.getByTestId('score-header')).toHaveTextContent('120');
			expect(screen.getByTestId('score-header')).toHaveTextContent('80');
		});

		it('should show round number', () => {
			const gameState = createTestGameState({ round: 5 });
			render(GameTable, { props: { ...defaultProps, gameState } });

			expect(screen.getByTestId('score-header')).toHaveTextContent('5');
		});
	});

	describe('landscape orientation', () => {
		it('should have landscape-oriented layout class', () => {
			render(GameTable, { props: defaultProps });

			const container = screen.getByTestId('game-table');
			expect(container).toHaveClass('landscape-only');
		});
	});

	describe('action buttons', () => {
		it('should show Roem button', () => {
			render(GameTable, { props: defaultProps });

			expect(screen.getByTestId('roem-button')).toBeInTheDocument();
			expect(screen.getByTestId('roem-button')).toHaveTextContent('Roem');
		});

		it('should show Verzaakt button', () => {
			render(GameTable, { props: defaultProps });

			expect(screen.getByTestId('verzaakt-button')).toBeInTheDocument();
			expect(screen.getByTestId('verzaakt-button')).toHaveTextContent('Verzaakt');
		});

		it('should disable Roem button when no cards in trick', () => {
			render(GameTable, { props: defaultProps });

			expect(screen.getByTestId('roem-button')).toBeDisabled();
		});

		it('should disable Verzaakt button when no cards in trick', () => {
			render(GameTable, { props: defaultProps });

			expect(screen.getByTestId('verzaakt-button')).toBeDisabled();
		});

		it('should enable Roem button when cards are in trick', () => {
			const gameState = createTestGameState({
				currentTrick: [{ card: { suit: '♠', rank: 'A' }, seat: 1 }]
			});
			render(GameTable, { props: { ...defaultProps, gameState } });

			expect(screen.getByTestId('roem-button')).toBeEnabled();
		});

		it('should enable Verzaakt button when cards are in trick', () => {
			const gameState = createTestGameState({
				currentTrick: [{ card: { suit: '♠', rank: 'A' }, seat: 1 }]
			});
			render(GameTable, { props: { ...defaultProps, gameState } });

			expect(screen.getByTestId('verzaakt-button')).toBeEnabled();
		});

		it('should disable Roem button when roem already claimed this trick', () => {
			const gameState = createTestGameState({
				currentTrick: [{ card: { suit: '♠', rank: 'A' }, seat: 1 }],
				roemClaimed: true
			});
			render(GameTable, { props: { ...defaultProps, gameState } });

			expect(screen.getByTestId('roem-button')).toBeDisabled();
		});
	});
});
