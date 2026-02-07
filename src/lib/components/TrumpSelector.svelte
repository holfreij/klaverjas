<script lang="ts">
	import type { Suit } from '$lib/game/deck';

	interface Props {
		isMyTurn: boolean;
		chooserName: string;
		onChoose: (suit: Suit) => void;
	}

	let { isMyTurn, chooserName, onChoose }: Props = $props();

	const suits: Suit[] = ['♠', '♥', '♣', '♦'];

	function getSuitColor(suit: Suit): string {
		return suit === '♥' || suit === '♦' ? 'text-red-500' : 'text-white';
	}
</script>

<div
	data-testid="trump-selector"
	class="absolute inset-0 z-50 flex items-center justify-center bg-black/60"
>
	<div class="rounded-xl bg-green-800 p-6 text-center shadow-2xl">
		{#if isMyTurn}
			<h2 class="mb-4 text-lg font-bold text-white">Kies troef</h2>
			<div class="flex gap-3">
				{#each suits as suit (suit)}
					<button
						onclick={() => onChoose(suit)}
						aria-label={suit}
						class="flex h-16 w-16 items-center justify-center rounded-lg bg-green-700 text-3xl transition-all
							hover:scale-110 hover:bg-green-600 active:scale-95
							{getSuitColor(suit)}"
					>
						{suit}
					</button>
				{/each}
			</div>
		{:else}
			<p class="text-white">
				Wacht op <span class="font-bold">{chooserName}</span> om troef te kiezen...
			</p>
		{/if}
	</div>
</div>
