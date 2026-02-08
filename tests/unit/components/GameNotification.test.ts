import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import GameNotification from '$lib/components/GameNotification.svelte';
import type { GameNotification as GameNotificationType } from '$lib/multiplayer/types';

describe('GameNotification', () => {
	it('should render nothing when notification is null', () => {
		render(GameNotification, { props: { notification: null } });

		expect(screen.queryByTestId('game-notification')).not.toBeInTheDocument();
	});

	it('should show roemClaimed message with points', () => {
		const notification: GameNotificationType = {
			type: 'roemClaimed',
			team: 'ns',
			points: 20,
			timestamp: Date.now()
		};
		render(GameNotification, { props: { notification } });

		const el = screen.getByTestId('game-notification');
		expect(el).toBeInTheDocument();
		expect(el).toHaveTextContent('Roem!');
		expect(el).toHaveTextContent('20');
	});

	it('should show roemRejected message', () => {
		const notification: GameNotificationType = {
			type: 'roemRejected',
			timestamp: Date.now()
		};
		render(GameNotification, { props: { notification } });

		const el = screen.getByTestId('game-notification');
		expect(el).toBeInTheDocument();
		expect(el).toHaveTextContent('Geen roem');
	});

	it('should show verzaaktFound message with player info', () => {
		const notification: GameNotificationType = {
			type: 'verzaaktFound',
			playerSeat: 2,
			team: 'ns',
			timestamp: Date.now()
		};
		render(GameNotification, { props: { notification } });

		const el = screen.getByTestId('game-notification');
		expect(el).toBeInTheDocument();
		expect(el).toHaveTextContent('Verzaakt');
	});

	it('should show verzaaktNotFound message', () => {
		const notification: GameNotificationType = {
			type: 'verzaaktNotFound',
			timestamp: Date.now()
		};
		render(GameNotification, { props: { notification } });

		const el = screen.getByTestId('game-notification');
		expect(el).toBeInTheDocument();
		expect(el).toHaveTextContent('Geen illegale zetten');
	});
});
