import { describe, it, expect } from 'vitest';
import {
	generateLobbyCode,
	validatePlayerName,
	canStartGame,
	getNewHost
} from '$lib/multiplayer/lobby';
import type { Player, PlayerSeat } from '$lib/multiplayer/types';

describe('generateLobbyCode', () => {
	it('should generate a 6-character string', () => {
		const code = generateLobbyCode();
		expect(code).toHaveLength(6);
	});

	it('should only contain digits', () => {
		const code = generateLobbyCode();
		expect(code).toMatch(/^\d{6}$/);
	});

	it('should generate different codes on multiple calls (probabilistic)', () => {
		const codes = new Set<string>();
		for (let i = 0; i < 100; i++) {
			codes.add(generateLobbyCode());
		}
		// With 1,000,000 possible codes, 100 calls should almost always be unique
		expect(codes.size).toBeGreaterThan(90);
	});
});

describe('validatePlayerName', () => {
	it('should reject empty string', () => {
		const result = validatePlayerName('');
		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should reject whitespace-only string', () => {
		const result = validatePlayerName('   ');
		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should reject names shorter than 3 characters after trimming', () => {
		const result = validatePlayerName('  ab  ');
		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should reject names longer than 50 characters', () => {
		const longName = 'a'.repeat(51);
		const result = validatePlayerName(longName);
		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should accept names exactly 3 characters', () => {
		const result = validatePlayerName('abc');
		expect(result.valid).toBe(true);
		expect(result.name).toBe('abc');
	});

	it('should accept names exactly 50 characters', () => {
		const name = 'a'.repeat(50);
		const result = validatePlayerName(name);
		expect(result.valid).toBe(true);
		expect(result.name).toBe(name);
	});

	it('should trim leading and trailing whitespace', () => {
		const result = validatePlayerName('  John Doe  ');
		expect(result.valid).toBe(true);
		expect(result.name).toBe('John Doe');
	});

	it('should preserve internal whitespace', () => {
		const result = validatePlayerName('John  Doe');
		expect(result.valid).toBe(true);
		expect(result.name).toBe('John  Doe');
	});
});

describe('canStartGame', () => {
	const createPlayer = (seat: PlayerSeat | 'table'): Player => ({
		name: `Player ${seat}`,
		seat,
		connected: true,
		lastSeen: Date.now()
	});

	it('should return false with no players', () => {
		const players: Record<string, Player> = {};
		expect(canStartGame(players)).toBe(false);
	});

	it('should return false with only 1 player', () => {
		const players: Record<string, Player> = {
			p1: createPlayer(0)
		};
		expect(canStartGame(players)).toBe(false);
	});

	it('should return false with 3 players', () => {
		const players: Record<string, Player> = {
			p1: createPlayer(0),
			p2: createPlayer(1),
			p3: createPlayer(2)
		};
		expect(canStartGame(players)).toBe(false);
	});

	it('should return true when all 4 seats are filled', () => {
		const players: Record<string, Player> = {
			p1: createPlayer(0),
			p2: createPlayer(1),
			p3: createPlayer(2),
			p4: createPlayer(3)
		};
		expect(canStartGame(players)).toBe(true);
	});

	it('should not count table device towards start condition', () => {
		const players: Record<string, Player> = {
			p1: createPlayer(0),
			p2: createPlayer(1),
			p3: createPlayer(2),
			table: createPlayer('table')
		};
		expect(canStartGame(players)).toBe(false);
	});

	it('should allow start with 4 players plus table device', () => {
		const players: Record<string, Player> = {
			p1: createPlayer(0),
			p2: createPlayer(1),
			p3: createPlayer(2),
			p4: createPlayer(3),
			table: createPlayer('table')
		};
		expect(canStartGame(players)).toBe(true);
	});
});

describe('getNewHost', () => {
	const createPlayer = (seat: PlayerSeat | 'table'): Player => ({
		name: `Player ${seat}`,
		seat,
		connected: true,
		lastSeen: Date.now()
	});

	it('should return null when no other players', () => {
		const players: Record<string, Player> = {
			host: createPlayer(0)
		};
		expect(getNewHost(players, 'host')).toBe(null);
	});

	it('should return the player with lowest seat number', () => {
		const players: Record<string, Player> = {
			host: createPlayer(0),
			p1: createPlayer(2),
			p2: createPlayer(1)
		};
		expect(getNewHost(players, 'host')).toBe('p2'); // seat 1 is lowest
	});

	it('should skip table device when selecting new host', () => {
		const players: Record<string, Player> = {
			host: createPlayer(0),
			table: createPlayer('table'),
			p1: createPlayer(2)
		};
		expect(getNewHost(players, 'host')).toBe('p1'); // table can't be host
	});

	it('should return null if only table device remains', () => {
		const players: Record<string, Player> = {
			host: createPlayer(0),
			table: createPlayer('table')
		};
		expect(getNewHost(players, 'host')).toBe(null);
	});
});
