import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import LobbyRoom from '$lib/components/LobbyRoom.svelte';
import type { Lobby, Player, PlayerSeat, Seat } from '$lib/multiplayer/types';

// Helper to create test player
function createPlayer(name: string, seat: PlayerSeat | 'table'): Player {
	return {
		name,
		seat,
		connected: true,
		lastSeen: Date.now()
	};
}

// Helper to create test lobby
function createLobby(code: string, hostId: string, players: Record<string, Player>): Lobby {
	return {
		code,
		host: hostId,
		createdAt: Date.now(),
		status: 'waiting',
		players,
		game: null
	};
}

// Create a mock store with reactive-like behavior
const createMockStore = () => {
	const players: Record<string, Player> = {
		p1: createPlayer('Host', 0)
	};

	return {
		lobby: createLobby('123456', 'p1', players) as Lobby | null,
		playerId: 'p1' as string | null,
		connectionState: 'connected' as string,
		error: null as string | null,
		isHost: true,
		currentPlayer: players.p1,
		canStart: false,
		isInLobby: true,
		playerCount: 1,
		create: vi.fn(),
		join: vi.fn(),
		leave: vi.fn(),
		switchSeat: vi.fn(),
		start: vi.fn(),
		tryReconnect: vi.fn(),
		clearError: vi.fn(),
		getPlayersBySeat: vi.fn(() => [{ playerId: 'p1', player: players.p1 }]),
		getPlayerAtSeat: vi.fn((seat: PlayerSeat | 'table') => {
			for (const [playerId, player] of Object.entries(players)) {
				if (player.seat === seat) {
					return { playerId, player };
				}
			}
			return null;
		})
	};
};

let mockStore = createMockStore();

// Mock the lobbyStore module
vi.mock('$lib/stores/lobbyStore.svelte', () => ({
	lobbyStore: {
		get lobby() {
			return mockStore.lobby;
		},
		get playerId() {
			return mockStore.playerId;
		},
		get connectionState() {
			return mockStore.connectionState;
		},
		get error() {
			return mockStore.error;
		},
		get isHost() {
			return mockStore.isHost;
		},
		get currentPlayer() {
			return mockStore.currentPlayer;
		},
		get canStart() {
			return mockStore.canStart;
		},
		get isInLobby() {
			return mockStore.isInLobby;
		},
		get playerCount() {
			return mockStore.playerCount;
		},
		create: (name: string) => mockStore.create(name),
		join: (code: string, name: string, seat?: Seat) => mockStore.join(code, name, seat),
		leave: () => mockStore.leave(),
		switchSeat: (seat: Seat) => mockStore.switchSeat(seat),
		start: () => mockStore.start(),
		tryReconnect: () => mockStore.tryReconnect(),
		clearError: () => mockStore.clearError(),
		getPlayersBySeat: () => mockStore.getPlayersBySeat(),
		getPlayerAtSeat: (seat: Seat) => mockStore.getPlayerAtSeat(seat)
	}
}));

// Mock clipboard API
Object.assign(navigator, {
	clipboard: {
		writeText: vi.fn()
	}
});

describe('LobbyRoom', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStore = createMockStore();
	});

	describe('lobby code display', () => {
		it('should display the lobby code', () => {
			render(LobbyRoom);

			expect(screen.getByText('123456')).toBeInTheDocument();
		});

		it('should display "Lobby code" label', () => {
			render(LobbyRoom);

			expect(screen.getByText('Lobby code')).toBeInTheDocument();
		});

		it('should copy lobby code when clicked', async () => {
			render(LobbyRoom);

			const codeButton = screen.getByText('123456');
			await fireEvent.click(codeButton);

			expect(navigator.clipboard.writeText).toHaveBeenCalledWith('123456');
		});
	});

	describe('player count display', () => {
		it('should display player count', () => {
			mockStore.playerCount = 2;
			render(LobbyRoom);

			expect(screen.getByText('2/4 spelers')).toBeInTheDocument();
		});

		it('should display 4/4 when full', () => {
			mockStore.playerCount = 4;
			render(LobbyRoom);

			expect(screen.getByText('4/4 spelers')).toBeInTheDocument();
		});
	});

	describe('seat buttons', () => {
		it('should display all four seat positions', () => {
			render(LobbyRoom);

			expect(screen.getByText('Zuid')).toBeInTheDocument();
			expect(screen.getByText('West')).toBeInTheDocument();
			expect(screen.getByText('Noord')).toBeInTheDocument();
			expect(screen.getByText('Oost')).toBeInTheDocument();
		});

		it('should display player name at occupied seat', () => {
			render(LobbyRoom);

			// "Host" appears twice - once as player name and once as badge
			// Use getAllByText and check for at least one
			const hostElements = screen.getAllByText('Host');
			expect(hostElements.length).toBeGreaterThanOrEqual(1);
		});

		it('should display "Leeg" for empty seats', () => {
			render(LobbyRoom);

			// There are 3 empty seats (1, 2, 3)
			const emptyLabels = screen.getAllByText('Leeg');
			expect(emptyLabels.length).toBe(3);
		});

		it('should call switchSeat when clicking empty seat', async () => {
			render(LobbyRoom);

			// Click on Noord seat (seat 2) which is empty
			const noordButton = screen.getByRole('button', { name: /noord/i });
			await fireEvent.click(noordButton);

			expect(mockStore.switchSeat).toHaveBeenCalledWith(2);
		});

		it('should call switchSeat when clicking occupied seat', async () => {
			// Set up with 2 players
			const players = {
				p1: createPlayer('Host', 0),
				p2: createPlayer('Player2', 1)
			};
			mockStore.lobby = createLobby('123456', 'p1', players);
			mockStore.getPlayerAtSeat = vi.fn((seat: PlayerSeat | 'table') => {
				for (const [playerId, player] of Object.entries(players)) {
					if (player.seat === seat) {
						return { playerId, player };
					}
				}
				return null;
			});

			render(LobbyRoom);

			// Click on West seat where Player2 is
			const westButton = screen.getByRole('button', { name: /west.*player2/i });
			await fireEvent.click(westButton);

			expect(mockStore.switchSeat).toHaveBeenCalledWith(1);
		});

		it('should show "Host" badge next to host player', () => {
			render(LobbyRoom);

			// Host badge should be visible
			expect(screen.getByText('Host', { selector: 'span.text-xs' })).toBeInTheDocument();
		});
	});

	describe('table device button', () => {
		it('should display table device button', () => {
			render(LobbyRoom);

			expect(screen.getByRole('button', { name: /tafel/i })).toBeInTheDocument();
		});

		it('should call switchSeat with "table" when clicked', async () => {
			render(LobbyRoom);

			const tableButton = screen.getByRole('button', { name: /tafel/i });
			await fireEvent.click(tableButton);

			expect(mockStore.switchSeat).toHaveBeenCalledWith('table');
		});

		it('should show table device player name when occupied', () => {
			const players = {
				p1: createPlayer('Host', 0),
				table: createPlayer('TableDevice', 'table')
			};
			mockStore.lobby = createLobby('123456', 'p1', players);
			mockStore.getPlayerAtSeat = vi.fn((seat: PlayerSeat | 'table') => {
				for (const [playerId, player] of Object.entries(players)) {
					if (player.seat === seat) {
						return { playerId, player };
					}
				}
				return null;
			});

			render(LobbyRoom);

			expect(screen.getByText('TableDevice')).toBeInTheDocument();
		});
	});

	describe('start game button', () => {
		it('should show "Wacht op meer spelers..." when less than 4 players', () => {
			mockStore.canStart = false;
			mockStore.playerCount = 2;
			render(LobbyRoom);

			expect(screen.getByText(/wacht op meer spelers/i)).toBeInTheDocument();
		});

		it('should show "Start spel" button when canStart is true and user is host', () => {
			mockStore.canStart = true;
			mockStore.isHost = true;
			mockStore.playerCount = 4;
			render(LobbyRoom);

			expect(screen.getByRole('button', { name: /start spel/i })).toBeInTheDocument();
		});

		it('should show "Wacht op host om te starten" when canStart but user is not host', () => {
			mockStore.canStart = true;
			mockStore.isHost = false;
			mockStore.playerCount = 4;
			render(LobbyRoom);

			expect(screen.getByText(/wacht op host om te starten/i)).toBeInTheDocument();
		});

		it('should call start when "Start spel" button is clicked', async () => {
			mockStore.canStart = true;
			mockStore.isHost = true;
			mockStore.start.mockResolvedValue(true);
			render(LobbyRoom);

			const startButton = screen.getByRole('button', { name: /start spel/i });
			await fireEvent.click(startButton);

			expect(mockStore.start).toHaveBeenCalled();
		});
	});

	describe('game started state', () => {
		it('should still render lobby view when status is playing (page handles routing)', () => {
			mockStore.lobby = {
				...mockStore.lobby!,
				status: 'playing'
			};
			render(LobbyRoom);

			// LobbyRoom still renders — page routing handles switching to GameView
			expect(screen.getByText('123456')).toBeInTheDocument();
		});
	});

	describe('leave lobby button', () => {
		it('should display leave button', () => {
			render(LobbyRoom);

			expect(screen.getByText(/verlaat lobby/i)).toBeInTheDocument();
		});

		it('should call leave when clicked', async () => {
			render(LobbyRoom);

			const leaveButton = screen.getByText(/verlaat lobby/i);
			await fireEvent.click(leaveButton);

			expect(mockStore.leave).toHaveBeenCalled();
		});
	});

	describe('error display', () => {
		it('should not show error when error is null', () => {
			mockStore.error = null;
			render(LobbyRoom);

			// Look for error container which has border-red-500
			const errorElements = document.querySelectorAll('.border-red-500');
			expect(errorElements.length).toBe(0);
		});

		it('should show error message when error exists', () => {
			mockStore.error = 'Kon niet van stoel wisselen';
			render(LobbyRoom);

			expect(screen.getByText('Kon niet van stoel wisselen')).toBeInTheDocument();
		});

		it('should call clearError when dismiss button is clicked', async () => {
			mockStore.error = 'Some error';
			render(LobbyRoom);

			const dismissButton = screen.getByRole('button', { name: /×/i });
			await fireEvent.click(dismissButton);

			expect(mockStore.clearError).toHaveBeenCalled();
		});
	});
});
