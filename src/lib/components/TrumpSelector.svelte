<script lang="ts">
	import type { Suit } from '$lib/game/deck';
	import { SUITS } from '$lib/game/deck';

	interface Props {
		onSelect: (suit: Suit) => void;
		playerName?: string;
	}

	let { onSelect, playerName = 'Player' }: Props = $props();

	const suitSymbols: Record<string, string> = {
		Harten: '♥',
		Ruiten: '♦',
		Klaver: '♣',
		Schoppen: '♠',
	};

	const suitColors: Record<string, string> = {
		Harten: 'text-red-500 hover:bg-red-100',
		Ruiten: 'text-red-500 hover:bg-red-100',
		Klaver: 'text-gray-900 hover:bg-gray-100',
		Schoppen: 'text-gray-900 hover:bg-gray-100',
	};

	const suitNames: Record<string, string> = {
		Harten: 'Harten',
		Ruiten: 'Ruiten',
		Klaver: 'Klaver',
		Schoppen: 'Schoppen',
	};
</script>

<div class="bg-green-800 rounded-lg p-4 shadow-lg">
	<h2 class="text-white text-lg font-bold mb-2 text-center">Choose Trump</h2>
	<p class="text-green-300 text-sm mb-4 text-center">{playerName}'s turn to select</p>

	<div class="grid grid-cols-2 gap-3">
		{#each SUITS as suit}
			<button
				type="button"
				class="
					bg-white rounded-lg p-4 flex flex-col items-center justify-center
					transition-all duration-150 hover:scale-105 active:scale-95
					border-2 border-transparent hover:border-amber-400
					{suitColors[suit]}
				"
				onclick={() => onSelect(suit)}
			>
				<span class="text-4xl">{suitSymbols[suit]}</span>
				<span class="text-sm mt-1 text-gray-600">{suitNames[suit]}</span>
			</button>
		{/each}
	</div>
</div>
