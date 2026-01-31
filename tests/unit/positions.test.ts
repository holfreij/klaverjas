import { describe, it, expect } from 'vitest';
import { getRelativePositions, getScreenPosition } from '$lib/game/positions';

describe('getRelativePositions', () => {
	it('should return correct positions from seat 0 (Zuid)', () => {
		const positions = getRelativePositions(0);

		expect(positions.self).toBe(0);
		expect(positions.partner).toBe(2); // Noord
		expect(positions.left).toBe(1); // West
		expect(positions.right).toBe(3); // Oost
	});

	it('should return correct positions from seat 1 (West)', () => {
		const positions = getRelativePositions(1);

		expect(positions.self).toBe(1);
		expect(positions.partner).toBe(3); // Oost
		expect(positions.left).toBe(2); // Noord
		expect(positions.right).toBe(0); // Zuid
	});

	it('should return correct positions from seat 2 (Noord)', () => {
		const positions = getRelativePositions(2);

		expect(positions.self).toBe(2);
		expect(positions.partner).toBe(0); // Zuid
		expect(positions.left).toBe(3); // Oost
		expect(positions.right).toBe(1); // West
	});

	it('should return correct positions from seat 3 (Oost)', () => {
		const positions = getRelativePositions(3);

		expect(positions.self).toBe(3);
		expect(positions.partner).toBe(1); // West
		expect(positions.left).toBe(0); // Zuid
		expect(positions.right).toBe(2); // Noord
	});
});

describe('getScreenPosition', () => {
	describe('from seat 0 perspective', () => {
		it('should place self at bottom', () => {
			expect(getScreenPosition(0, 0)).toBe('bottom');
		});

		it('should place partner at top', () => {
			expect(getScreenPosition(2, 0)).toBe('top');
		});

		it('should place left opponent at left', () => {
			expect(getScreenPosition(1, 0)).toBe('left');
		});

		it('should place right opponent at right', () => {
			expect(getScreenPosition(3, 0)).toBe('right');
		});
	});

	describe('from seat 1 perspective', () => {
		it('should place self at bottom', () => {
			expect(getScreenPosition(1, 1)).toBe('bottom');
		});

		it('should place partner at top', () => {
			expect(getScreenPosition(3, 1)).toBe('top');
		});

		it('should place left opponent at left', () => {
			expect(getScreenPosition(2, 1)).toBe('left');
		});

		it('should place right opponent at right', () => {
			expect(getScreenPosition(0, 1)).toBe('right');
		});
	});

	describe('from seat 2 perspective', () => {
		it('should place self at bottom', () => {
			expect(getScreenPosition(2, 2)).toBe('bottom');
		});

		it('should place partner at top', () => {
			expect(getScreenPosition(0, 2)).toBe('top');
		});

		it('should place left opponent at left', () => {
			expect(getScreenPosition(3, 2)).toBe('left');
		});

		it('should place right opponent at right', () => {
			expect(getScreenPosition(1, 2)).toBe('right');
		});
	});

	describe('from seat 3 perspective', () => {
		it('should place self at bottom', () => {
			expect(getScreenPosition(3, 3)).toBe('bottom');
		});

		it('should place partner at top', () => {
			expect(getScreenPosition(1, 3)).toBe('top');
		});

		it('should place left opponent at left', () => {
			expect(getScreenPosition(0, 3)).toBe('left');
		});

		it('should place right opponent at right', () => {
			expect(getScreenPosition(2, 3)).toBe('right');
		});
	});
});
