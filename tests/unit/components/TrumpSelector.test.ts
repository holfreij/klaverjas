import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TrumpSelector from '$lib/components/TrumpSelector.svelte';

describe('TrumpSelector', () => {
	describe('when it is my turn to choose', () => {
		it('should render all 4 suit buttons', () => {
			render(TrumpSelector, {
				props: {
					isMyTurn: true,
					chooserName: 'Rolf',
					onChoose: vi.fn()
				}
			});

			expect(screen.getByRole('button', { name: /♠/ })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /♥/ })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /♣/ })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /♦/ })).toBeInTheDocument();
		});

		it('should display "Kies troef" title', () => {
			render(TrumpSelector, {
				props: {
					isMyTurn: true,
					chooserName: 'Rolf',
					onChoose: vi.fn()
				}
			});

			expect(screen.getByText('Kies troef')).toBeInTheDocument();
		});

		it('should call onChoose with the selected suit when clicking spades', async () => {
			const onChoose = vi.fn();
			render(TrumpSelector, {
				props: {
					isMyTurn: true,
					chooserName: 'Rolf',
					onChoose
				}
			});

			await fireEvent.click(screen.getByRole('button', { name: /♠/ }));
			expect(onChoose).toHaveBeenCalledWith('♠');
		});

		it('should call onChoose with hearts when clicking hearts', async () => {
			const onChoose = vi.fn();
			render(TrumpSelector, {
				props: {
					isMyTurn: true,
					chooserName: 'Rolf',
					onChoose
				}
			});

			await fireEvent.click(screen.getByRole('button', { name: /♥/ }));
			expect(onChoose).toHaveBeenCalledWith('♥');
		});

		it('should call onChoose with clubs when clicking clubs', async () => {
			const onChoose = vi.fn();
			render(TrumpSelector, {
				props: {
					isMyTurn: true,
					chooserName: 'Rolf',
					onChoose
				}
			});

			await fireEvent.click(screen.getByRole('button', { name: /♣/ }));
			expect(onChoose).toHaveBeenCalledWith('♣');
		});

		it('should call onChoose with diamonds when clicking diamonds', async () => {
			const onChoose = vi.fn();
			render(TrumpSelector, {
				props: {
					isMyTurn: true,
					chooserName: 'Rolf',
					onChoose
				}
			});

			await fireEvent.click(screen.getByRole('button', { name: /♦/ }));
			expect(onChoose).toHaveBeenCalledWith('♦');
		});

		it('should have enabled suit buttons', () => {
			render(TrumpSelector, {
				props: {
					isMyTurn: true,
					chooserName: 'Rolf',
					onChoose: vi.fn()
				}
			});

			const buttons = screen.getAllByRole('button');
			buttons.forEach((button) => {
				expect(button).not.toBeDisabled();
			});
		});
	});

	describe('when it is not my turn to choose', () => {
		it('should show waiting message with chooser name', () => {
			render(TrumpSelector, {
				props: {
					isMyTurn: false,
					chooserName: 'Henk',
					onChoose: vi.fn()
				}
			});

			expect(screen.getByText(/Henk/)).toBeInTheDocument();
			expect(screen.getByText(/troef/i)).toBeInTheDocument();
		});

		it('should not show suit buttons', () => {
			render(TrumpSelector, {
				props: {
					isMyTurn: false,
					chooserName: 'Henk',
					onChoose: vi.fn()
				}
			});

			expect(screen.queryByRole('button', { name: /♠/ })).not.toBeInTheDocument();
		});
	});

	it('should have a semi-transparent backdrop', () => {
		const { container } = render(TrumpSelector, {
			props: {
				isMyTurn: true,
				chooserName: 'Rolf',
				onChoose: vi.fn()
			}
		});

		const backdrop = container.querySelector('[data-testid="trump-selector"]');
		expect(backdrop).toBeInTheDocument();
	});
});
