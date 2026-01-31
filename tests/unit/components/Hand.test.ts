import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Hand from '$lib/components/Hand.svelte';
import type { Card, Suit } from '$lib/game/deck';

describe('Hand', () => {
	// Sample cards for testing
	const aceOfSpades: Card = { suit: '♠', rank: 'A' };
	const kingOfSpades: Card = { suit: '♠', rank: 'K' };
	const queenOfHearts: Card = { suit: '♥', rank: 'Q' };
	const jackOfHearts: Card = { suit: '♥', rank: 'J' };
	const tenOfClubs: Card = { suit: '♣', rank: '10' };
	const sevenOfDiamonds: Card = { suit: '♦', rank: '7' };
	const nineOfDiamonds: Card = { suit: '♦', rank: '9' };
	const eightOfClubs: Card = { suit: '♣', rank: '8' };

	const sampleHand: Card[] = [
		aceOfSpades,
		queenOfHearts,
		tenOfClubs,
		sevenOfDiamonds,
		kingOfSpades,
		jackOfHearts,
		nineOfDiamonds,
		eightOfClubs
	];

	const trump: Suit = '♥';

	describe('rendering', () => {
		it('should render all cards in hand', () => {
			const onCardPlay = vi.fn();
			render(Hand, { props: { cards: sampleHand, trump, onCardPlay } });

			// Should have 8 cards
			const cards = screen.getAllByTestId('card');
			expect(cards).toHaveLength(8);
		});

		it('should render empty state for empty hand', () => {
			const onCardPlay = vi.fn();
			render(Hand, { props: { cards: [], trump, onCardPlay } });

			const cards = screen.queryAllByTestId('card');
			expect(cards).toHaveLength(0);
		});

		it('should display cards with correct suits', () => {
			const onCardPlay = vi.fn();
			render(Hand, { props: { cards: sampleHand, trump, onCardPlay } });

			// Check all suits are present (using getAllByText since some suits appear multiple times)
			expect(screen.getAllByText('♠').length).toBeGreaterThan(0);
			expect(screen.getAllByText('♥').length).toBeGreaterThan(0);
			expect(screen.getAllByText('♣').length).toBeGreaterThan(0);
			expect(screen.getAllByText('♦').length).toBeGreaterThan(0);
		});
	});

	describe('sorting', () => {
		it('should sort cards by suit order (♠, ♥, ♣, ♦)', () => {
			const onCardPlay = vi.fn();
			// Cards in random order
			const unsortedHand: Card[] = [
				{ suit: '♦', rank: 'A' },
				{ suit: '♠', rank: 'A' },
				{ suit: '♣', rank: 'A' },
				{ suit: '♥', rank: 'A' }
			];
			render(Hand, { props: { cards: unsortedHand, trump, onCardPlay } });

			const cards = screen.getAllByTestId('card');
			// Get all spans, the second span in each card is the suit
			const suits = cards.map((card) => {
				const spans = card.querySelectorAll('span');
				return spans[1]?.textContent;
			});

			// Should be in order: ♠, ♥, ♣, ♦
			expect(suits).toEqual(['♠', '♥', '♣', '♦']);
		});

		it('should sort ranks within suit by strength (non-trump: A-10-K-Q-J-9-8-7)', () => {
			const onCardPlay = vi.fn();
			// All spades in random order, hearts is trump
			const unsortedHand: Card[] = [
				{ suit: '♠', rank: '7' },
				{ suit: '♠', rank: 'A' },
				{ suit: '♠', rank: 'J' },
				{ suit: '♠', rank: '10' }
			];
			render(Hand, { props: { cards: unsortedHand, trump: '♥', onCardPlay } });

			const cards = screen.getAllByTestId('card');
			// Get all spans, the first span in each card is the rank
			const ranks = cards.map((card) => {
				const spans = card.querySelectorAll('span');
				return spans[0]?.textContent;
			});

			// Non-trump order: A-10-K-Q-J-9-8-7
			expect(ranks).toEqual(['A', '10', 'J', '7']);
		});

		it('should sort trump suit by trump strength (J-9-A-10-K-Q-8-7)', () => {
			const onCardPlay = vi.fn();
			// All hearts (trump) in random order
			const unsortedHand: Card[] = [
				{ suit: '♥', rank: '7' },
				{ suit: '♥', rank: 'J' },
				{ suit: '♥', rank: 'A' },
				{ suit: '♥', rank: '9' }
			];
			render(Hand, { props: { cards: unsortedHand, trump: '♥', onCardPlay } });

			const cards = screen.getAllByTestId('card');
			// Get all spans, the first span in each card is the rank
			const ranks = cards.map((card) => {
				const spans = card.querySelectorAll('span');
				return spans[0]?.textContent;
			});

			// Trump order: J-9-A-10-K-Q-8-7
			expect(ranks).toEqual(['J', '9', 'A', '7']);
		});
	});

	describe('card interaction', () => {
		it('should call onCardPlay with correct card when card is clicked', async () => {
			const onCardPlay = vi.fn();
			const simpleHand: Card[] = [aceOfSpades];
			render(Hand, { props: { cards: simpleHand, trump, onCardPlay } });

			const card = screen.getByTestId('card');
			await fireEvent.click(card);

			expect(onCardPlay).toHaveBeenCalledWith(aceOfSpades);
		});

		it('should call onCardPlay with the specific card that was clicked', async () => {
			const onCardPlay = vi.fn();
			const twoCardHand: Card[] = [
				{ suit: '♠', rank: 'A' },
				{ suit: '♥', rank: 'K' }
			];
			render(Hand, { props: { cards: twoCardHand, trump, onCardPlay } });

			// Click the second card (King of Hearts)
			const cards = screen.getAllByTestId('card');
			await fireEvent.click(cards[1]);

			expect(onCardPlay).toHaveBeenCalledWith({ suit: '♥', rank: 'K' });
		});

		it('should not call onCardPlay when disabled', async () => {
			const onCardPlay = vi.fn();
			const simpleHand: Card[] = [aceOfSpades];
			render(Hand, { props: { cards: simpleHand, trump, onCardPlay, disabled: true } });

			const card = screen.getByTestId('card');
			await fireEvent.click(card);

			expect(onCardPlay).not.toHaveBeenCalled();
		});
	});

	describe('disabled state', () => {
		it('should disable all cards when disabled is true', () => {
			const onCardPlay = vi.fn();
			render(Hand, { props: { cards: sampleHand, trump, onCardPlay, disabled: true } });

			const cards = screen.getAllByTestId('card');
			cards.forEach((card) => {
				expect(card).toHaveClass('opacity-50');
			});
		});

		it('should not disable cards when disabled is false', () => {
			const onCardPlay = vi.fn();
			render(Hand, { props: { cards: sampleHand, trump, onCardPlay, disabled: false } });

			const cards = screen.getAllByTestId('card');
			cards.forEach((card) => {
				expect(card).not.toHaveClass('opacity-50');
			});
		});
	});

	describe('accessibility', () => {
		it('should have accessible region label', () => {
			const onCardPlay = vi.fn();
			render(Hand, { props: { cards: sampleHand, trump, onCardPlay } });

			expect(screen.getByRole('region', { name: /jouw kaarten/i })).toBeInTheDocument();
		});
	});
});
