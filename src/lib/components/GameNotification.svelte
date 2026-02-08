<script lang="ts">
	import type { GameNotification } from '$lib/multiplayer/types';
	import { SEAT_NAMES } from '$lib/multiplayer/types';

	interface Props {
		notification: GameNotification | null;
	}

	let { notification }: Props = $props();

	let message = $derived.by(() => {
		if (!notification) return '';
		switch (notification.type) {
			case 'roemClaimed':
				return `Roem! ${notification.points} punten`;
			case 'roemRejected':
				return 'Geen roem gevonden';
			case 'verzaaktFound': {
				const name =
					notification.playerSeat !== undefined ? SEAT_NAMES[notification.playerSeat] : '?';
				return `Verzaakt door ${name}!`;
			}
			case 'verzaaktNotFound':
				return 'Geen illegale zetten gevonden';
		}
	});

	let colorClass = $derived.by(() => {
		if (!notification) return '';
		switch (notification.type) {
			case 'roemClaimed':
				return 'bg-amber-600';
			case 'roemRejected':
				return 'bg-gray-600';
			case 'verzaaktFound':
				return 'bg-red-600';
			case 'verzaaktNotFound':
				return 'bg-gray-600';
		}
	});
</script>

{#if notification}
	<div
		data-testid="game-notification"
		class="pointer-events-none absolute inset-x-0 top-16 z-50 flex justify-center"
	>
		<div class="rounded-lg px-6 py-3 text-lg font-bold text-white shadow-lg {colorClass}">
			{message}
		</div>
	</div>
{/if}
