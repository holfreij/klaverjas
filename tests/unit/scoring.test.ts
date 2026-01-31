import { describe, it, expect } from 'vitest';
import type { Card, Suit } from '$lib/game/deck';
import {
	getCardPoints,
	calculateTrickPoints,
	calculateRoundResult,
	calculateMajorityThreshold
} from '$lib/game/scoring';

const card = (suit: Suit, rank: Card['rank']): Card => ({ suit, rank });

describe('getCardPoints', () => {
	describe('trump cards', () => {
		it('should return 20 for trump J', () => {
			expect(getCardPoints(card('♠', 'J'), '♠')).toBe(20);
		});

		it('should return 14 for trump 9', () => {
			expect(getCardPoints(card('♠', '9'), '♠')).toBe(14);
		});

		it('should return 11 for trump A', () => {
			expect(getCardPoints(card('♠', 'A'), '♠')).toBe(11);
		});

		it('should return 10 for trump 10', () => {
			expect(getCardPoints(card('♠', '10'), '♠')).toBe(10);
		});

		it('should return 4 for trump K', () => {
			expect(getCardPoints(card('♠', 'K'), '♠')).toBe(4);
		});

		it('should return 3 for trump Q', () => {
			expect(getCardPoints(card('♠', 'Q'), '♠')).toBe(3);
		});

		it('should return 0 for trump 8', () => {
			expect(getCardPoints(card('♠', '8'), '♠')).toBe(0);
		});

		it('should return 0 for trump 7', () => {
			expect(getCardPoints(card('♠', '7'), '♠')).toBe(0);
		});
	});

	describe('non-trump cards', () => {
		it('should return 11 for non-trump A', () => {
			expect(getCardPoints(card('♥', 'A'), '♠')).toBe(11);
		});

		it('should return 10 for non-trump 10', () => {
			expect(getCardPoints(card('♥', '10'), '♠')).toBe(10);
		});

		it('should return 4 for non-trump K', () => {
			expect(getCardPoints(card('♥', 'K'), '♠')).toBe(4);
		});

		it('should return 3 for non-trump Q', () => {
			expect(getCardPoints(card('♥', 'Q'), '♠')).toBe(3);
		});

		it('should return 2 for non-trump J', () => {
			expect(getCardPoints(card('♥', 'J'), '♠')).toBe(2);
		});

		it('should return 0 for non-trump 9', () => {
			expect(getCardPoints(card('♥', '9'), '♠')).toBe(0);
		});

		it('should return 0 for non-trump 8', () => {
			expect(getCardPoints(card('♥', '8'), '♠')).toBe(0);
		});

		it('should return 0 for non-trump 7', () => {
			expect(getCardPoints(card('♥', '7'), '♠')).toBe(0);
		});
	});
});

describe('calculateTrickPoints', () => {
	it('should sum card points in a trick', () => {
		const trick = [card('♠', 'A'), card('♠', '10'), card('♠', 'K'), card('♠', 'Q')];
		// All trump: 11 + 10 + 4 + 3 = 28
		expect(calculateTrickPoints(trick, '♠')).toBe(28);
	});

	it('should handle mixed trump and non-trump', () => {
		const trick = [card('♠', 'J'), card('♥', 'A'), card('♣', '10'), card('♦', 'K')];
		// Trump J (20) + A (11) + 10 (10) + K (4) = 45
		expect(calculateTrickPoints(trick, '♠')).toBe(45);
	});

	it('should handle zero-point trick', () => {
		const trick = [card('♥', '7'), card('♥', '8'), card('♣', '7'), card('♣', '8')];
		expect(calculateTrickPoints(trick, '♠')).toBe(0);
	});
});

describe('calculateMajorityThreshold', () => {
	it('should return 82 when no roem (half of 162 + 1)', () => {
		expect(calculateMajorityThreshold(0)).toBe(82);
	});

	it('should return 102 when 40 roem (half of 202 + 1)', () => {
		expect(calculateMajorityThreshold(40)).toBe(102);
	});

	it('should return 112 when 60 roem', () => {
		expect(calculateMajorityThreshold(60)).toBe(112);
	});

	it('should return 132 when 100 roem (four of a kind)', () => {
		expect(calculateMajorityThreshold(100)).toBe(132);
	});
});

describe('calculateRoundResult', () => {
	describe('normal win', () => {
		it('should award points to playing team when they reach majority', () => {
			const result = calculateRoundResult({
				playingTeamPoints: 90,
				defendingTeamPoints: 72,
				playingTeamRoem: 0,
				defendingTeamRoem: 0,
				playingTeamTricks: 5,
				isVerzaakt: false
			});
			expect(result.playingTeamScore).toBe(90);
			expect(result.defendingTeamScore).toBe(72);
			expect(result.isNat).toBe(false);
			expect(result.isPit).toBe(false);
		});

		it('should include roem in scores', () => {
			const result = calculateRoundResult({
				playingTeamPoints: 100,
				defendingTeamPoints: 62,
				playingTeamRoem: 20,
				defendingTeamRoem: 0,
				playingTeamTricks: 5,
				isVerzaakt: false
			});
			expect(result.playingTeamScore).toBe(120); // 100 + 20 roem
			expect(result.defendingTeamScore).toBe(62);
		});
	});

	describe('nat (playing team fails)', () => {
		it('should give 0 to playing team and 162 + all roem to defenders', () => {
			const result = calculateRoundResult({
				playingTeamPoints: 70,
				defendingTeamPoints: 92,
				playingTeamRoem: 20,
				defendingTeamRoem: 0,
				playingTeamTricks: 3,
				isVerzaakt: false
			});
			expect(result.playingTeamScore).toBe(0);
			expect(result.defendingTeamScore).toBe(182); // 162 + 20 roem
			expect(result.isNat).toBe(true);
			expect(result.isPit).toBe(false);
		});

		it('should give all roem to defenders on nat', () => {
			const result = calculateRoundResult({
				playingTeamPoints: 60,
				defendingTeamPoints: 102,
				playingTeamRoem: 40,
				defendingTeamRoem: 20,
				playingTeamTricks: 2,
				isVerzaakt: false
			});
			expect(result.playingTeamScore).toBe(0);
			expect(result.defendingTeamScore).toBe(222); // 162 + 40 + 20 roem
			expect(result.isNat).toBe(true);
		});
	});

	describe('pit (playing team wins all tricks)', () => {
		it('should award 262 points (162 + 100 bonus) to playing team', () => {
			const result = calculateRoundResult({
				playingTeamPoints: 162,
				defendingTeamPoints: 0,
				playingTeamRoem: 0,
				defendingTeamRoem: 0,
				playingTeamTricks: 8,
				isVerzaakt: false
			});
			expect(result.playingTeamScore).toBe(262);
			expect(result.defendingTeamScore).toBe(0);
			expect(result.isNat).toBe(false);
			expect(result.isPit).toBe(true);
		});

		it('should include roem with pit bonus', () => {
			const result = calculateRoundResult({
				playingTeamPoints: 162,
				defendingTeamPoints: 0,
				playingTeamRoem: 40,
				defendingTeamRoem: 0,
				playingTeamTricks: 8,
				isVerzaakt: false
			});
			expect(result.playingTeamScore).toBe(302); // 162 + 100 + 40
			expect(result.defendingTeamScore).toBe(0);
			expect(result.isPit).toBe(true);
		});
	});

	describe('verzaakt', () => {
		it('should give 0 to verzaakt team and 162 + all roem to opponents', () => {
			const result = calculateRoundResult({
				playingTeamPoints: 100,
				defendingTeamPoints: 62,
				playingTeamRoem: 20,
				defendingTeamRoem: 0,
				playingTeamTricks: 5,
				isVerzaakt: true,
				verzaaktByPlayingTeam: true
			});
			expect(result.playingTeamScore).toBe(0);
			expect(result.defendingTeamScore).toBe(182); // 162 + 20
		});

		it('should give 0 to defending team on verzaakt', () => {
			const result = calculateRoundResult({
				playingTeamPoints: 80,
				defendingTeamPoints: 82,
				playingTeamRoem: 0,
				defendingTeamRoem: 20,
				playingTeamTricks: 4,
				isVerzaakt: true,
				verzaaktByPlayingTeam: false
			});
			expect(result.playingTeamScore).toBe(182); // 162 + 20
			expect(result.defendingTeamScore).toBe(0);
		});
	});

	describe('edge cases', () => {
		it('should verify total base points equal 162', () => {
			// This is a sanity check - playing + defending should equal 162 (before roem)
			const result = calculateRoundResult({
				playingTeamPoints: 80,
				defendingTeamPoints: 82,
				playingTeamRoem: 0,
				defendingTeamRoem: 0,
				playingTeamTricks: 4,
				isVerzaakt: false
			});
			expect(result.playingTeamScore + result.defendingTeamScore).toBe(162);
		});

		it('should handle threshold exactly at 82 (playing team needs strict majority)', () => {
			// With 81 points (no roem), playing team is nat
			const result = calculateRoundResult({
				playingTeamPoints: 81,
				defendingTeamPoints: 81,
				playingTeamRoem: 0,
				defendingTeamRoem: 0,
				playingTeamTricks: 4,
				isVerzaakt: false
			});
			expect(result.isNat).toBe(true);
		});

		it('should win with exactly 82 points (no roem)', () => {
			const result = calculateRoundResult({
				playingTeamPoints: 82,
				defendingTeamPoints: 80,
				playingTeamRoem: 0,
				defendingTeamRoem: 0,
				playingTeamTricks: 4,
				isVerzaakt: false
			});
			expect(result.isNat).toBe(false);
		});
	});
});
