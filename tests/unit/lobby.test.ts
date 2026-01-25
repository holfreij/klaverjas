/**
 * Tests for lobby utilities.
 */

import { describe, it, expect } from 'vitest';
import { generateLobbyCode, generatePlayerId, isLobbyFull, getPlayersBySeat } from '$lib/multiplayer/lobby';
import type { Lobby, LobbyPlayer } from '$lib/multiplayer/types';

describe('generateLobbyCode', () => {
	it('should generate a 6-character code', () => {
		const code = generateLobbyCode();
		expect(code).toHaveLength(6);
	});

	it('should only use allowed characters', () => {
		const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		for (let i = 0; i < 100; i++) {
			const code = generateLobbyCode();
			for (const char of code) {
				expect(allowedChars).toContain(char);
			}
		}
	});

	it('should not use confusing characters (I, O, 0, 1)', () => {
		const confusingChars = 'IO01';
		for (let i = 0; i < 100; i++) {
			const code = generateLobbyCode();
			for (const char of code) {
				expect(confusingChars).not.toContain(char);
			}
		}
	});

	it('should generate different codes', () => {
		const codes = new Set<string>();
		for (let i = 0; i < 100; i++) {
			codes.add(generateLobbyCode());
		}
		// With 6 characters from 32 chars, collision in 100 tries is extremely unlikely
		expect(codes.size).toBeGreaterThan(95);
	});
});

describe('generatePlayerId', () => {
	it('should generate a player ID with player_ prefix', () => {
		const id = generatePlayerId();
		expect(id).toMatch(/^player_\d+_[a-z0-9]+$/);
	});

	it('should generate unique IDs', () => {
		const ids = new Set<string>();
		for (let i = 0; i < 100; i++) {
			ids.add(generatePlayerId());
		}
		expect(ids.size).toBe(100);
	});
});

describe('isLobbyFull', () => {
	function createLobby(seats: (number | 'spectator' | 'table')[]): Lobby {
		const players: Record<string, LobbyPlayer> = {};
		seats.forEach((seat, i) => {
			players[`player${i}`] = {
				name: `Player ${i}`,
				seat,
				connected: true,
				lastSeen: Date.now(),
			};
		});

		return {
			code: 'ABC123',
			host: 'player0',
			createdAt: Date.now(),
			status: 'waiting',
			players,
			game: null,
		};
	}

	it('should return false for empty lobby', () => {
		const lobby = createLobby([]);
		expect(isLobbyFull(lobby)).toBe(false);
	});

	it('should return false for lobby with only host', () => {
		const lobby = createLobby([0]);
		expect(isLobbyFull(lobby)).toBe(false);
	});

	it('should return false for lobby with 3 players', () => {
		const lobby = createLobby([0, 1, 2]);
		expect(isLobbyFull(lobby)).toBe(false);
	});

	it('should return true for lobby with 4 players', () => {
		const lobby = createLobby([0, 1, 2, 3]);
		expect(isLobbyFull(lobby)).toBe(true);
	});

	it('should not count spectators as players', () => {
		const lobby = createLobby([0, 1, 2, 'spectator']);
		expect(isLobbyFull(lobby)).toBe(false);
	});

	it('should not count table device as player', () => {
		const lobby = createLobby([0, 1, 2, 'table']);
		expect(isLobbyFull(lobby)).toBe(false);
	});

	it('should return true with 4 players and spectators', () => {
		const lobby = createLobby([0, 1, 2, 3, 'spectator', 'spectator']);
		expect(isLobbyFull(lobby)).toBe(true);
	});
});

describe('getPlayersBySeat', () => {
	function createLobby(
		playersData: { seat: number | 'spectator' | 'table'; name: string }[]
	): Lobby {
		const players: Record<string, LobbyPlayer> = {};
		playersData.forEach((p, i) => {
			players[`player${i}`] = {
				name: p.name,
				seat: p.seat,
				connected: true,
				lastSeen: Date.now(),
			};
		});

		return {
			code: 'ABC123',
			host: 'player0',
			createdAt: Date.now(),
			status: 'waiting',
			players,
			game: null,
		};
	}

	it('should return empty array for empty lobby', () => {
		const lobby = createLobby([]);
		expect(getPlayersBySeat(lobby)).toEqual([]);
	});

	it('should sort players by seat number', () => {
		const lobby = createLobby([
			{ seat: 3, name: 'East' },
			{ seat: 0, name: 'South' },
			{ seat: 2, name: 'North' },
			{ seat: 1, name: 'West' },
		]);

		const sorted = getPlayersBySeat(lobby);
		expect(sorted.map((p) => p.player.name)).toEqual(['South', 'West', 'North', 'East']);
	});

	it('should put spectators at the end', () => {
		const lobby = createLobby([
			{ seat: 'spectator', name: 'Watcher' },
			{ seat: 0, name: 'South' },
			{ seat: 2, name: 'North' },
		]);

		const sorted = getPlayersBySeat(lobby);
		expect(sorted.map((p) => p.player.name)).toEqual(['South', 'North', 'Watcher']);
	});

	it('should put table device at the end', () => {
		const lobby = createLobby([
			{ seat: 'table', name: 'Table' },
			{ seat: 1, name: 'West' },
		]);

		const sorted = getPlayersBySeat(lobby);
		expect(sorted.map((p) => p.player.name)).toEqual(['West', 'Table']);
	});
});
