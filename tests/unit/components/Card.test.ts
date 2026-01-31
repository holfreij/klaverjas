import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Card from '$lib/components/Card.svelte';
import type { Card as CardType } from '$lib/game/deck';

describe('Card', () => {
	const aceOfSpades: CardType = { suit: '♠', rank: 'A' };
	const queenOfHearts: CardType = { suit: '♥', rank: 'Q' };
	const sevenOfDiamonds: CardType = { suit: '♦', rank: '7' };
	const jackOfClubs: CardType = { suit: '♣', rank: 'J' };
	const tenOfHearts: CardType = { suit: '♥', rank: '10' };

	describe('rendering', () => {
		it('should render card with correct rank', () => {
			render(Card, { props: { card: aceOfSpades } });

			expect(screen.getByText('A')).toBeInTheDocument();
		});

		it('should render card with correct suit symbol', () => {
			render(Card, { props: { card: aceOfSpades } });

			expect(screen.getByText('♠')).toBeInTheDocument();
		});

		it('should render 10 as rank correctly', () => {
			render(Card, { props: { card: tenOfHearts } });

			expect(screen.getByText('10')).toBeInTheDocument();
		});

		it('should render hearts suit with red color', () => {
			render(Card, { props: { card: queenOfHearts } });

			const suitElement = screen.getByText('♥');
			expect(suitElement).toHaveClass('text-red-600');
		});

		it('should render diamonds suit with red color', () => {
			render(Card, { props: { card: sevenOfDiamonds } });

			const suitElement = screen.getByText('♦');
			expect(suitElement).toHaveClass('text-red-600');
		});

		it('should render spades suit with black color', () => {
			render(Card, { props: { card: aceOfSpades } });

			const suitElement = screen.getByText('♠');
			expect(suitElement).toHaveClass('text-gray-900');
		});

		it('should render clubs suit with black color', () => {
			render(Card, { props: { card: jackOfClubs } });

			const suitElement = screen.getByText('♣');
			expect(suitElement).toHaveClass('text-gray-900');
		});
	});

	describe('face down', () => {
		it('should not show rank when faceUp is false', () => {
			render(Card, { props: { card: aceOfSpades, faceUp: false } });

			expect(screen.queryByText('A')).not.toBeInTheDocument();
		});

		it('should not show suit when faceUp is false', () => {
			render(Card, { props: { card: aceOfSpades, faceUp: false } });

			expect(screen.queryByText('♠')).not.toBeInTheDocument();
		});

		it('should show card back pattern when faceUp is false', () => {
			render(Card, { props: { card: aceOfSpades, faceUp: false } });

			const cardElement = screen.getByTestId('card');
			expect(cardElement).toHaveClass('bg-blue-800');
		});
	});

	describe('selected state', () => {
		it('should show selected indicator when selected is true', () => {
			render(Card, { props: { card: aceOfSpades, selected: true } });

			const cardElement = screen.getByTestId('card');
			expect(cardElement).toHaveClass('ring-2', 'ring-yellow-400');
		});

		it('should not show selected indicator when selected is false', () => {
			render(Card, { props: { card: aceOfSpades, selected: false } });

			const cardElement = screen.getByTestId('card');
			expect(cardElement).not.toHaveClass('ring-yellow-400');
		});
	});

	describe('disabled state', () => {
		it('should show disabled styling when disabled is true', () => {
			render(Card, { props: { card: aceOfSpades, disabled: true } });

			const cardElement = screen.getByTestId('card');
			expect(cardElement).toHaveClass('opacity-50');
		});

		it('should not show disabled styling when disabled is false', () => {
			render(Card, { props: { card: aceOfSpades, disabled: false } });

			const cardElement = screen.getByTestId('card');
			expect(cardElement).not.toHaveClass('opacity-50');
		});
	});

	describe('click handling', () => {
		it('should call onClick when clicked', async () => {
			const onClick = vi.fn();
			render(Card, { props: { card: aceOfSpades, onClick } });

			const cardElement = screen.getByTestId('card');
			await fireEvent.click(cardElement);

			expect(onClick).toHaveBeenCalledTimes(1);
		});

		it('should not call onClick when disabled', async () => {
			const onClick = vi.fn();
			render(Card, { props: { card: aceOfSpades, disabled: true, onClick } });

			const cardElement = screen.getByTestId('card');
			await fireEvent.click(cardElement);

			expect(onClick).not.toHaveBeenCalled();
		});

		it('should not error when onClick is not provided', async () => {
			render(Card, { props: { card: aceOfSpades } });

			const cardElement = screen.getByTestId('card');
			await expect(fireEvent.click(cardElement)).resolves.not.toThrow();
		});
	});

	describe('accessibility', () => {
		it('should have accessible label for spades ace', () => {
			render(Card, { props: { card: aceOfSpades } });

			expect(screen.getByLabelText('Aas van Schoppen')).toBeInTheDocument();
		});

		it('should have accessible label for queen of hearts', () => {
			render(Card, { props: { card: queenOfHearts } });

			expect(screen.getByLabelText('Vrouw van Harten')).toBeInTheDocument();
		});

		it('should have accessible label for 7 of diamonds', () => {
			render(Card, { props: { card: sevenOfDiamonds } });

			expect(screen.getByLabelText('7 van Ruiten')).toBeInTheDocument();
		});

		it('should have accessible label for jack of clubs', () => {
			render(Card, { props: { card: jackOfClubs } });

			expect(screen.getByLabelText('Boer van Klaveren')).toBeInTheDocument();
		});

		it('should have label indicating face down when faceUp is false', () => {
			render(Card, { props: { card: aceOfSpades, faceUp: false } });

			expect(screen.getByLabelText('Kaart (omgedraaid)')).toBeInTheDocument();
		});

		it('should have button role when clickable', () => {
			const onClick = vi.fn();
			render(Card, { props: { card: aceOfSpades, onClick } });

			expect(screen.getByRole('button')).toBeInTheDocument();
		});
	});
});
