import { describe, it, expect } from 'vitest';
import { getSeatTeam, SEAT_NAMES } from '$lib/multiplayer/types';

describe('getSeatTeam', () => {
	it('should return "ns" for seat 0 (Zuid)', () => {
		expect(getSeatTeam(0)).toBe('ns');
	});

	it('should return "ns" for seat 2 (Noord)', () => {
		expect(getSeatTeam(2)).toBe('ns');
	});

	it('should return "we" for seat 1 (West)', () => {
		expect(getSeatTeam(1)).toBe('we');
	});

	it('should return "we" for seat 3 (Oost)', () => {
		expect(getSeatTeam(3)).toBe('we');
	});
});

describe('SEAT_NAMES', () => {
	it('should have correct Dutch names for all seats', () => {
		expect(SEAT_NAMES[0]).toBe('Zuid');
		expect(SEAT_NAMES[1]).toBe('West');
		expect(SEAT_NAMES[2]).toBe('Noord');
		expect(SEAT_NAMES[3]).toBe('Oost');
	});

	it('should have exactly 4 seats', () => {
		expect(Object.keys(SEAT_NAMES)).toHaveLength(4);
	});
});
