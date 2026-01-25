<script lang="ts">
	import type { Suit } from '$lib/game/deck';
	import type { PlayedCard } from '$lib/game/rules';
	import Card from './Card.svelte';

	interface Props {
		currentTrick: PlayedCard[];
		trump: Suit | null;
		currentPlayer: number;
		playerNames?: string[];
	}

	let {
		currentTrick,
		trump,
		currentPlayer,
		playerNames = ['South', 'West', 'North', 'East'],
	}: Props = $props();

	// Map player positions to visual positions on the table
	// Player 0 = South (bottom), 1 = West (left), 2 = North (top), 3 = East (right)
	const positionStyles: Record<number, string> = {
		0: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-2',
		1: 'left-0 top-1/2 -translate-y-1/2 -translate-x-2',
		2: 'top-0 left-1/2 -translate-x-1/2 -translate-y-2',
		3: 'right-0 top-1/2 -translate-y-1/2 translate-x-2',
	};

	const namePositions: Record<number, string> = {
		0: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-8',
		1: 'left-0 top-1/2 -translate-y-1/2 -translate-x-16',
		2: 'top-0 left-1/2 -translate-x-1/2 -translate-y-8',
		3: 'right-0 top-1/2 -translate-y-1/2 translate-x-16',
	};

	const suitSymbols: Record<string, string> = {
		Harten: '♥',
		Ruiten: '♦',
		Klaver: '♣',
		Schoppen: '♠',
	};

	const suitColors: Record<string, string> = {
		Harten: 'text-red-500',
		Ruiten: 'text-red-500',
		Klaver: 'text-white',
		Schoppen: 'text-white',
	};
</script>

<div class="relative w-64 h-64 bg-green-800 rounded-full border-4 border-green-700 shadow-inner">
	<!-- Trump indicator -->
	{#if trump}
		<div class="absolute top-2 right-2 bg-green-900 rounded px-2 py-1 flex items-center gap-1">
			<span class="text-green-300 text-xs">Trump:</span>
			<span class="text-xl {suitColors[trump]}">{suitSymbols[trump]}</span>
		</div>
	{/if}

	<!-- Player names and turn indicator -->
	{#each [0, 1, 2, 3] as player}
		<div class="absolute {namePositions[player]} whitespace-nowrap">
			<span
				class="
					text-sm px-2 py-0.5 rounded
					{currentPlayer === player
						? 'bg-amber-500 text-amber-900 font-bold animate-pulse'
						: 'text-green-300'}
				"
			>
				{playerNames[player]}
			</span>
		</div>
	{/each}

	<!-- Played cards -->
	{#each currentTrick as playedCard (playedCard.player)}
		<div class="absolute {positionStyles[playedCard.player]}">
			<Card card={playedCard.card} size="large" />
		</div>
	{/each}

	<!-- Center text when no cards played -->
	{#if currentTrick.length === 0}
		<div class="absolute inset-0 flex items-center justify-center text-green-600 text-sm">
			{#if trump}
				Play a card
			{:else}
				Select trump
			{/if}
		</div>
	{/if}
</div>
