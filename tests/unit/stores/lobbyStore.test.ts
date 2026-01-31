import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Lobby, Player, PlayerSeat } from '$lib/multiplayer/types';

// Mock the lobbyService module before importing lobbyStore
vi.mock('$lib/multiplayer/lobbyService', () => ({
	createLobby: vi.fn(),
	joinLobby: vi.fn(),
	leaveLobby: vi.fn(),
	changeSeat: vi.fn(),
	startGame: vi.fn(),
	subscribeLobby: vi.fn(),
	reconnect: vi.fn(),
	clearSession: vi.fn(),
	getSession: vi.fn()
}));

// Mock canStartGame from lobby module
vi.mock('$lib/multiplayer/lobby', () => ({
	canStartGame: vi.fn()
}));

// Import after mocking
import { lobbyStore } from '$lib/stores/lobbyStore.svelte';
import * as lobbyService from '$lib/multiplayer/lobbyService';
import { canStartGame } from '$lib/multiplayer/lobby';

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

describe('LobbyStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset store state by calling cleanup-like behavior
		// We'll do this by setting state directly since it's exposed
		lobbyStore.lobby = null;
		lobbyStore.playerId = null;
		lobbyStore.connectionState = 'initial';
		lobbyStore.error = null;
	});

	describe('create()', () => {
		it('should set playerId and subscribe on successful creation', async () => {
			const mockUnsubscribe = vi.fn();
			(lobbyService.createLobby as Mock).mockResolvedValue({
				success: true,
				lobbyCode: '123456',
				playerId: 'player1'
			});
			(lobbyService.subscribeLobby as Mock).mockReturnValue(mockUnsubscribe);

			const result = await lobbyStore.create('TestPlayer');

			expect(result).toBe(true);
			expect(lobbyStore.playerId).toBe('player1');
			expect(lobbyService.createLobby).toHaveBeenCalledWith('TestPlayer');
			expect(lobbyService.subscribeLobby).toHaveBeenCalledWith('123456', expect.any(Function));
		});

		it('should set connectionState to "connecting" during creation', async () => {
			let connectionStateDuringCall: string | undefined;

			(lobbyService.createLobby as Mock).mockImplementation(() => {
				connectionStateDuringCall = lobbyStore.connectionState;
				return Promise.resolve({ success: true, lobbyCode: '123456', playerId: 'p1' });
			});
			(lobbyService.subscribeLobby as Mock).mockReturnValue(vi.fn());

			await lobbyStore.create('TestPlayer');

			expect(connectionStateDuringCall).toBe('connecting');
		});

		it('should set error and connectionState to "error" on failure', async () => {
			(lobbyService.createLobby as Mock).mockResolvedValue({
				success: false,
				error: 'Naam moet minimaal 3 tekens zijn'
			});

			const result = await lobbyStore.create('ab');

			expect(result).toBe(false);
			expect(lobbyStore.error).toBe('Naam moet minimaal 3 tekens zijn');
			expect(lobbyStore.connectionState).toBe('error');
			expect(lobbyStore.playerId).toBe(null);
		});

		it('should use default error message when error is not provided', async () => {
			(lobbyService.createLobby as Mock).mockResolvedValue({
				success: false
			});

			await lobbyStore.create('TestPlayer');

			expect(lobbyStore.error).toBe('Onbekende fout');
		});
	});

	describe('join()', () => {
		it('should set playerId and subscribe on successful join', async () => {
			const mockUnsubscribe = vi.fn();
			(lobbyService.joinLobby as Mock).mockResolvedValue({
				success: true,
				playerId: 'player2'
			});
			(lobbyService.subscribeLobby as Mock).mockReturnValue(mockUnsubscribe);

			const result = await lobbyStore.join('123456', 'Player2');

			expect(result).toBe(true);
			expect(lobbyStore.playerId).toBe('player2');
			expect(lobbyService.joinLobby).toHaveBeenCalledWith('123456', 'Player2', undefined);
			expect(lobbyService.subscribeLobby).toHaveBeenCalledWith('123456', expect.any(Function));
		});

		it('should pass preferred seat to joinLobby', async () => {
			(lobbyService.joinLobby as Mock).mockResolvedValue({
				success: true,
				playerId: 'player2'
			});
			(lobbyService.subscribeLobby as Mock).mockReturnValue(vi.fn());

			await lobbyStore.join('123456', 'Player2', 2);

			expect(lobbyService.joinLobby).toHaveBeenCalledWith('123456', 'Player2', 2);
		});

		it('should set error on failure', async () => {
			(lobbyService.joinLobby as Mock).mockResolvedValue({
				success: false,
				error: 'Lobby niet gevonden'
			});

			const result = await lobbyStore.join('999999', 'Player');

			expect(result).toBe(false);
			expect(lobbyStore.error).toBe('Lobby niet gevonden');
			expect(lobbyStore.connectionState).toBe('error');
		});
	});

	describe('leave()', () => {
		it('should call leaveLobby and cleanup state', async () => {
			// Setup initial state
			lobbyStore.lobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });
			lobbyStore.playerId = 'p1';
			lobbyStore.connectionState = 'connected';

			(lobbyService.leaveLobby as Mock).mockResolvedValue(undefined);

			await lobbyStore.leave();

			expect(lobbyService.leaveLobby).toHaveBeenCalledWith('123456', 'p1');
			expect(lobbyService.clearSession).toHaveBeenCalled();
			expect(lobbyStore.lobby).toBe(null);
			expect(lobbyStore.playerId).toBe(null);
			expect(lobbyStore.connectionState).toBe('initial');
		});

		it('should cleanup without calling leaveLobby when not in lobby', async () => {
			lobbyStore.lobby = null;
			lobbyStore.playerId = null;

			await lobbyStore.leave();

			expect(lobbyService.leaveLobby).not.toHaveBeenCalled();
			expect(lobbyService.clearSession).toHaveBeenCalled();
		});
	});

	describe('switchSeat()', () => {
		it('should call changeSeat and return true on success', async () => {
			lobbyStore.lobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });
			lobbyStore.playerId = 'p1';

			(lobbyService.changeSeat as Mock).mockResolvedValue({ success: true });

			const result = await lobbyStore.switchSeat(2);

			expect(result).toBe(true);
			expect(lobbyService.changeSeat).toHaveBeenCalledWith('123456', 'p1', 2);
			expect(lobbyStore.error).toBe(null);
		});

		it('should set error and return false when not in lobby', async () => {
			lobbyStore.lobby = null;
			lobbyStore.playerId = null;

			const result = await lobbyStore.switchSeat(2);

			expect(result).toBe(false);
			expect(lobbyStore.error).toBe('Niet verbonden met lobby');
			expect(lobbyService.changeSeat).not.toHaveBeenCalled();
		});

		it('should set error and return false on changeSeat failure', async () => {
			lobbyStore.lobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });
			lobbyStore.playerId = 'p1';

			(lobbyService.changeSeat as Mock).mockResolvedValue({
				success: false,
				error: 'Stoel is bezet'
			});

			const result = await lobbyStore.switchSeat(2);

			expect(result).toBe(false);
			expect(lobbyStore.error).toBe('Stoel is bezet');
		});

		it('should use default error message when error is not provided', async () => {
			lobbyStore.lobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });
			lobbyStore.playerId = 'p1';

			(lobbyService.changeSeat as Mock).mockResolvedValue({ success: false });

			await lobbyStore.switchSeat(2);

			expect(lobbyStore.error).toBe('Kon niet van stoel wisselen');
		});
	});

	describe('start()', () => {
		it('should call startGame and return true on success', async () => {
			lobbyStore.lobby = createLobby('123456', 'p1', {
				p1: createPlayer('Host', 0),
				p2: createPlayer('P2', 1),
				p3: createPlayer('P3', 2),
				p4: createPlayer('P4', 3)
			});
			lobbyStore.playerId = 'p1';

			(lobbyService.startGame as Mock).mockResolvedValue({ success: true });

			const result = await lobbyStore.start();

			expect(result).toBe(true);
			expect(lobbyService.startGame).toHaveBeenCalledWith('123456', 'p1');
		});

		it('should set error and return false when not in lobby', async () => {
			lobbyStore.lobby = null;
			lobbyStore.playerId = null;

			const result = await lobbyStore.start();

			expect(result).toBe(false);
			expect(lobbyStore.error).toBe('Niet verbonden met lobby');
			expect(lobbyService.startGame).not.toHaveBeenCalled();
		});

		it('should set error and return false on startGame failure', async () => {
			lobbyStore.lobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });
			lobbyStore.playerId = 'p1';

			(lobbyService.startGame as Mock).mockResolvedValue({
				success: false,
				error: 'Niet alle stoelen zijn bezet'
			});

			const result = await lobbyStore.start();

			expect(result).toBe(false);
			expect(lobbyStore.error).toBe('Niet alle stoelen zijn bezet');
		});
	});

	describe('tryReconnect()', () => {
		it('should return false when no session exists', async () => {
			(lobbyService.getSession as Mock).mockReturnValue(null);

			const result = await lobbyStore.tryReconnect();

			expect(result).toBe(false);
			expect(lobbyService.reconnect).not.toHaveBeenCalled();
		});

		it('should set connectionState to "reconnecting" during reconnection', async () => {
			let connectionStateDuringCall: string | undefined;

			(lobbyService.getSession as Mock).mockReturnValue({
				playerId: 'p1',
				lobbyCode: '123456',
				playerName: 'Test'
			});
			(lobbyService.reconnect as Mock).mockImplementation(() => {
				connectionStateDuringCall = lobbyStore.connectionState;
				return Promise.resolve({
					success: true,
					lobby: createLobby('123456', 'p1', {}),
					playerId: 'p1'
				});
			});
			(lobbyService.subscribeLobby as Mock).mockReturnValue(vi.fn());

			await lobbyStore.tryReconnect();

			expect(connectionStateDuringCall).toBe('reconnecting');
		});

		it('should set playerId and subscribe on successful reconnect', async () => {
			const testLobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });

			(lobbyService.getSession as Mock).mockReturnValue({
				playerId: 'p1',
				lobbyCode: '123456',
				playerName: 'Host'
			});
			(lobbyService.reconnect as Mock).mockResolvedValue({
				success: true,
				lobby: testLobby,
				playerId: 'p1'
			});
			(lobbyService.subscribeLobby as Mock).mockReturnValue(vi.fn());

			const result = await lobbyStore.tryReconnect();

			expect(result).toBe(true);
			expect(lobbyStore.playerId).toBe('p1');
			expect(lobbyService.subscribeLobby).toHaveBeenCalledWith('123456', expect.any(Function));
		});

		it('should reset connectionState to "initial" on failed reconnect', async () => {
			(lobbyService.getSession as Mock).mockReturnValue({
				playerId: 'p1',
				lobbyCode: '123456',
				playerName: 'Test'
			});
			(lobbyService.reconnect as Mock).mockResolvedValue({
				success: false,
				error: 'Lobby bestaat niet meer'
			});

			const result = await lobbyStore.tryReconnect();

			expect(result).toBe(false);
			expect(lobbyStore.connectionState).toBe('initial');
		});
	});

	describe('clearError()', () => {
		it('should clear the error state', () => {
			lobbyStore.error = 'Some error';

			lobbyStore.clearError();

			expect(lobbyStore.error).toBe(null);
		});
	});

	describe('getPlayersBySeat()', () => {
		it('should return empty array when no lobby', () => {
			lobbyStore.lobby = null;

			expect(lobbyStore.getPlayersBySeat()).toEqual([]);
		});

		it('should return empty array when no players', () => {
			lobbyStore.lobby = createLobby('123456', 'p1', {});

			expect(lobbyStore.getPlayersBySeat()).toEqual([]);
		});

		it('should return players sorted by seat number', () => {
			const players = {
				p3: createPlayer('P3', 2),
				p1: createPlayer('P1', 0),
				p2: createPlayer('P2', 1)
			};
			lobbyStore.lobby = createLobby('123456', 'p1', players);

			const result = lobbyStore.getPlayersBySeat();

			expect(result).toHaveLength(3);
			expect(result[0].player.seat).toBe(0);
			expect(result[1].player.seat).toBe(1);
			expect(result[2].player.seat).toBe(2);
		});

		it('should place table device at the end', () => {
			const players = {
				p1: createPlayer('P1', 0),
				table: createPlayer('Table', 'table'),
				p2: createPlayer('P2', 1)
			};
			lobbyStore.lobby = createLobby('123456', 'p1', players);

			const result = lobbyStore.getPlayersBySeat();

			expect(result).toHaveLength(3);
			expect(result[2].player.seat).toBe('table');
		});
	});

	describe('getPlayerAtSeat()', () => {
		it('should return null when no lobby', () => {
			lobbyStore.lobby = null;

			expect(lobbyStore.getPlayerAtSeat(0)).toBe(null);
		});

		it('should return null when seat is empty', () => {
			const players = {
				p1: createPlayer('P1', 0)
			};
			lobbyStore.lobby = createLobby('123456', 'p1', players);

			expect(lobbyStore.getPlayerAtSeat(2)).toBe(null);
		});

		it('should return player at specified seat', () => {
			const players = {
				p1: createPlayer('Host', 0),
				p2: createPlayer('Player2', 1)
			};
			lobbyStore.lobby = createLobby('123456', 'p1', players);

			const result = lobbyStore.getPlayerAtSeat(1);

			expect(result).not.toBe(null);
			expect(result?.playerId).toBe('p2');
			expect(result?.player.name).toBe('Player2');
		});

		it('should return table device when requested', () => {
			const players = {
				p1: createPlayer('Host', 0),
				table: createPlayer('TableDevice', 'table')
			};
			lobbyStore.lobby = createLobby('123456', 'p1', players);

			const result = lobbyStore.getPlayerAtSeat('table');

			expect(result).not.toBe(null);
			expect(result?.playerId).toBe('table');
			expect(result?.player.name).toBe('TableDevice');
		});
	});

	describe('derived state', () => {
		describe('isHost', () => {
			it('should return false when no lobby', () => {
				lobbyStore.lobby = null;
				lobbyStore.playerId = 'p1';

				expect(lobbyStore.isHost).toBe(false);
			});

			it('should return true when playerId matches lobby.host', () => {
				lobbyStore.lobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });
				lobbyStore.playerId = 'p1';

				expect(lobbyStore.isHost).toBe(true);
			});

			it('should return false when playerId does not match lobby.host', () => {
				lobbyStore.lobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });
				lobbyStore.playerId = 'p2';

				expect(lobbyStore.isHost).toBe(false);
			});
		});

		describe('currentPlayer', () => {
			it('should return null when no playerId', () => {
				lobbyStore.lobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });
				lobbyStore.playerId = null;

				expect(lobbyStore.currentPlayer).toBe(null);
			});

			it('should return null when no lobby', () => {
				lobbyStore.lobby = null;
				lobbyStore.playerId = 'p1';

				expect(lobbyStore.currentPlayer).toBe(null);
			});

			it('should return player when both exist', () => {
				const player = createPlayer('Host', 0);
				lobbyStore.lobby = createLobby('123456', 'p1', { p1: player });
				lobbyStore.playerId = 'p1';

				expect(lobbyStore.currentPlayer).toEqual(player);
			});
		});

		describe('canStart', () => {
			it('should return false when no lobby', () => {
				lobbyStore.lobby = null;

				expect(lobbyStore.canStart).toBe(false);
			});

			it('should delegate to canStartGame when lobby exists', () => {
				const players = { p1: createPlayer('Host', 0) };
				lobbyStore.lobby = createLobby('123456', 'p1', players);

				(canStartGame as Mock).mockReturnValue(false);
				expect(lobbyStore.canStart).toBe(false);

				(canStartGame as Mock).mockReturnValue(true);
				// Need to trigger reactivity by reassigning lobby
				lobbyStore.lobby = { ...lobbyStore.lobby };
				expect(lobbyStore.canStart).toBe(true);
			});
		});

		describe('isInLobby', () => {
			it('should return false when lobby is null', () => {
				lobbyStore.lobby = null;
				lobbyStore.playerId = 'p1';

				expect(lobbyStore.isInLobby).toBe(false);
			});

			it('should return false when playerId is null', () => {
				lobbyStore.lobby = createLobby('123456', 'p1', {});
				lobbyStore.playerId = null;

				expect(lobbyStore.isInLobby).toBe(false);
			});

			it('should return true when both lobby and playerId exist', () => {
				lobbyStore.lobby = createLobby('123456', 'p1', {});
				lobbyStore.playerId = 'p1';

				expect(lobbyStore.isInLobby).toBe(true);
			});
		});

		describe('playerCount', () => {
			it('should return 0 when no lobby', () => {
				lobbyStore.lobby = null;

				expect(lobbyStore.playerCount).toBe(0);
			});

			it('should return 0 when no players', () => {
				lobbyStore.lobby = createLobby('123456', 'p1', {});

				expect(lobbyStore.playerCount).toBe(0);
			});

			it('should count only non-table players', () => {
				const players = {
					p1: createPlayer('P1', 0),
					p2: createPlayer('P2', 1),
					table: createPlayer('Table', 'table')
				};
				lobbyStore.lobby = createLobby('123456', 'p1', players);

				expect(lobbyStore.playerCount).toBe(2);
			});

			it('should count all 4 players when full', () => {
				const players = {
					p1: createPlayer('P1', 0),
					p2: createPlayer('P2', 1),
					p3: createPlayer('P3', 2),
					p4: createPlayer('P4', 3)
				};
				lobbyStore.lobby = createLobby('123456', 'p1', players);

				expect(lobbyStore.playerCount).toBe(4);
			});
		});
	});

	describe('subscription callback behavior', () => {
		it('should update lobby and connectionState when subscription receives data', async () => {
			let subscriptionCallback: ((lobby: Lobby | null) => void) | undefined;

			(lobbyService.createLobby as Mock).mockResolvedValue({
				success: true,
				lobbyCode: '123456',
				playerId: 'p1'
			});
			(lobbyService.subscribeLobby as Mock).mockImplementation((code, callback) => {
				subscriptionCallback = callback;
				return vi.fn();
			});

			await lobbyStore.create('Host');

			// Simulate subscription receiving data
			const testLobby = createLobby('123456', 'p1', { p1: createPlayer('Host', 0) });
			subscriptionCallback?.(testLobby);

			expect(lobbyStore.lobby).toEqual(testLobby);
			expect(lobbyStore.connectionState).toBe('connected');
		});

		it('should cleanup and set error when subscription receives null (lobby deleted)', async () => {
			let subscriptionCallback: ((lobby: Lobby | null) => void) | undefined;

			(lobbyService.createLobby as Mock).mockResolvedValue({
				success: true,
				lobbyCode: '123456',
				playerId: 'p1'
			});
			(lobbyService.subscribeLobby as Mock).mockImplementation((code, callback) => {
				subscriptionCallback = callback;
				return vi.fn();
			});

			await lobbyStore.create('Host');

			// Simulate lobby being deleted
			subscriptionCallback?.(null);

			expect(lobbyStore.lobby).toBe(null);
			expect(lobbyStore.playerId).toBe(null);
			expect(lobbyStore.connectionState).toBe('initial');
			expect(lobbyStore.error).toBe('Lobby bestaat niet meer');
		});
	});
});
