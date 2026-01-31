import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import HomePage from '$lib/components/HomePage.svelte';

import type { Lobby, Player, PlayerSeat } from '$lib/multiplayer/types';

// Create a mock store with reactive-like behavior
const createMockStore = () => ({
	lobby: null as Lobby | null,
	playerId: null as string | null,
	connectionState: 'initial' as string,
	error: null as string | null,
	isHost: false,
	currentPlayer: null as Player | null,
	canStart: false,
	isInLobby: false,
	playerCount: 0,
	create: vi.fn(),
	join: vi.fn(),
	leave: vi.fn(),
	switchSeat: vi.fn(),
	start: vi.fn(),
	tryReconnect: vi.fn(),
	clearError: vi.fn(),
	getPlayersBySeat: vi.fn(() => [] as Array<{ playerId: string; player: Player }>),
	getPlayerAtSeat: vi.fn(
		(_seat: PlayerSeat | 'table') => null as { playerId: string; player: Player } | null
	)
});

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
		join: (code: string, name: string) => mockStore.join(code, name),
		leave: () => mockStore.leave(),
		switchSeat: (seat: PlayerSeat | 'table') => mockStore.switchSeat(seat),
		start: () => mockStore.start(),
		tryReconnect: () => mockStore.tryReconnect(),
		clearError: () => mockStore.clearError(),
		getPlayersBySeat: () => mockStore.getPlayersBySeat(),
		getPlayerAtSeat: (seat: PlayerSeat | 'table') => mockStore.getPlayerAtSeat(seat)
	}
}));

describe('HomePage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStore = createMockStore();
	});

	describe('rendering', () => {
		it('should render the title', () => {
			render(HomePage);

			expect(screen.getByRole('heading', { name: 'Klaverjas' })).toBeInTheDocument();
		});

		it('should render player name input', () => {
			render(HomePage);

			expect(screen.getByLabelText(/jouw naam/i)).toBeInTheDocument();
		});

		it('should render create lobby section', () => {
			render(HomePage);

			expect(screen.getByRole('heading', { name: /nieuw spel/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /maak lobby/i })).toBeInTheDocument();
		});

		it('should render join lobby section', () => {
			render(HomePage);

			expect(screen.getByRole('heading', { name: /deelnemen/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /deelnemen/i })).toBeInTheDocument();
		});

		it('should render lobby code input', () => {
			render(HomePage);

			expect(screen.getByPlaceholderText(/6-cijferige code/i)).toBeInTheDocument();
		});
	});

	describe('create lobby button', () => {
		it('should be disabled when player name is empty', () => {
			render(HomePage);

			const createButton = screen.getByRole('button', { name: /maak lobby/i });
			expect(createButton).toBeDisabled();
		});

		it('should be enabled when player name is entered', async () => {
			render(HomePage);

			const nameInput = screen.getByLabelText(/jouw naam/i);
			await fireEvent.input(nameInput, { target: { value: 'TestPlayer' } });

			const createButton = screen.getByRole('button', { name: /maak lobby/i });
			expect(createButton).toBeEnabled();
		});

		it('should be disabled when name is only whitespace', async () => {
			render(HomePage);

			const nameInput = screen.getByLabelText(/jouw naam/i);
			await fireEvent.input(nameInput, { target: { value: '   ' } });

			const createButton = screen.getByRole('button', { name: /maak lobby/i });
			expect(createButton).toBeDisabled();
		});

		it('should call lobbyStore.create when clicked', async () => {
			mockStore.create.mockResolvedValue(true);
			render(HomePage);

			const nameInput = screen.getByLabelText(/jouw naam/i);
			await fireEvent.input(nameInput, { target: { value: 'TestPlayer' } });

			const createButton = screen.getByRole('button', { name: /maak lobby/i });
			await fireEvent.click(createButton);

			expect(mockStore.create).toHaveBeenCalledWith('TestPlayer');
		});

		it('should show loading state during creation', async () => {
			let resolveCreate: (value?: unknown) => void;
			mockStore.create.mockImplementation(
				() => new Promise((resolve) => (resolveCreate = resolve))
			);
			render(HomePage);

			const nameInput = screen.getByLabelText(/jouw naam/i);
			await fireEvent.input(nameInput, { target: { value: 'TestPlayer' } });

			const createButton = screen.getByRole('button', { name: /maak lobby/i });
			await fireEvent.click(createButton);

			expect(screen.getByRole('button', { name: /bezig/i })).toBeInTheDocument();

			resolveCreate!();
		});
	});

	describe('join lobby button', () => {
		it('should be disabled when player name is empty', () => {
			render(HomePage);

			const joinButton = screen.getByRole('button', { name: /deelnemen/i });
			expect(joinButton).toBeDisabled();
		});

		it('should be disabled when lobby code is empty', async () => {
			render(HomePage);

			const nameInput = screen.getByLabelText(/jouw naam/i);
			await fireEvent.input(nameInput, { target: { value: 'TestPlayer' } });

			const joinButton = screen.getByRole('button', { name: /deelnemen/i });
			expect(joinButton).toBeDisabled();
		});

		it('should be disabled when lobby code is less than 6 digits', async () => {
			render(HomePage);

			const nameInput = screen.getByLabelText(/jouw naam/i);
			await fireEvent.input(nameInput, { target: { value: 'TestPlayer' } });

			const codeInput = screen.getByPlaceholderText(/6-cijferige code/i);
			await fireEvent.input(codeInput, { target: { value: '12345' } });

			const joinButton = screen.getByRole('button', { name: /deelnemen/i });
			expect(joinButton).toBeDisabled();
		});

		it('should be enabled when name and valid code are entered', async () => {
			render(HomePage);

			const nameInput = screen.getByLabelText(/jouw naam/i);
			await fireEvent.input(nameInput, { target: { value: 'TestPlayer' } });

			const codeInput = screen.getByPlaceholderText(/6-cijferige code/i);
			await fireEvent.input(codeInput, { target: { value: '123456' } });

			const joinButton = screen.getByRole('button', { name: /deelnemen/i });
			expect(joinButton).toBeEnabled();
		});

		it('should filter non-numeric characters from lobby code', async () => {
			render(HomePage);

			const nameInput = screen.getByLabelText(/jouw naam/i);
			await fireEvent.input(nameInput, { target: { value: 'TestPlayer' } });

			const codeInput = screen.getByPlaceholderText(/6-cijferige code/i);
			await fireEvent.input(codeInput, { target: { value: 'abc123def456' } });

			// Button should be enabled because filtered value is "123456"
			const joinButton = screen.getByRole('button', { name: /deelnemen/i });
			expect(joinButton).toBeEnabled();
		});

		it('should call lobbyStore.join when clicked', async () => {
			mockStore.join.mockResolvedValue(true);
			render(HomePage);

			const nameInput = screen.getByLabelText(/jouw naam/i);
			await fireEvent.input(nameInput, { target: { value: 'TestPlayer' } });

			const codeInput = screen.getByPlaceholderText(/6-cijferige code/i);
			await fireEvent.input(codeInput, { target: { value: '123456' } });

			const joinButton = screen.getByRole('button', { name: /deelnemen/i });
			await fireEvent.click(joinButton);

			expect(mockStore.join).toHaveBeenCalledWith('123456', 'TestPlayer');
		});

		it('should show loading state during join', async () => {
			let resolveJoin: (value?: unknown) => void;
			mockStore.join.mockImplementation(() => new Promise((resolve) => (resolveJoin = resolve)));
			render(HomePage);

			const nameInput = screen.getByLabelText(/jouw naam/i);
			await fireEvent.input(nameInput, { target: { value: 'TestPlayer' } });

			const codeInput = screen.getByPlaceholderText(/6-cijferige code/i);
			await fireEvent.input(codeInput, { target: { value: '123456' } });

			const joinButton = screen.getByRole('button', { name: /deelnemen/i });
			await fireEvent.click(joinButton);

			// Both buttons show "Bezig..." - find the one in the join section
			const buttons = screen.getAllByRole('button', { name: /bezig/i });
			expect(buttons.length).toBeGreaterThan(0);

			resolveJoin!();
		});
	});

	describe('error display', () => {
		it('should not show error when error is null', () => {
			mockStore.error = null;
			render(HomePage);

			expect(screen.queryByText(/fout/i)).not.toBeInTheDocument();
		});

		it('should show error message when error exists', () => {
			mockStore.error = 'Lobby niet gevonden';
			render(HomePage);

			expect(screen.getByText('Lobby niet gevonden')).toBeInTheDocument();
		});

		it('should call clearError when dismiss button is clicked', async () => {
			mockStore.error = 'Some error';
			render(HomePage);

			const dismissButton = screen.getByRole('button', { name: /×/i });
			await fireEvent.click(dismissButton);

			expect(mockStore.clearError).toHaveBeenCalled();
		});
	});

	describe('connection status', () => {
		it('should show connecting message when connectionState is "connecting"', () => {
			mockStore.connectionState = 'connecting';
			render(HomePage);

			expect(screen.getByText(/verbinding maken/i)).toBeInTheDocument();
		});

		it('should show reconnecting message when connectionState is "reconnecting"', () => {
			mockStore.connectionState = 'reconnecting';
			render(HomePage);

			expect(screen.getByText(/opnieuw verbinden/i)).toBeInTheDocument();
		});

		it('should not show status message when connectionState is "initial"', () => {
			mockStore.connectionState = 'initial';
			render(HomePage);

			expect(screen.queryByText(/verbinding/i)).not.toBeInTheDocument();
		});
	});
});
