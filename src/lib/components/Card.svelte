<script lang="ts">
	import type { Card } from '$lib/game/deck';

	interface Props {
		card: Card;
		faceUp?: boolean;
		selected?: boolean;
		disabled?: boolean;
		onClick?: () => void;
	}

	let { card, faceUp = true, selected = false, disabled = false, onClick }: Props = $props();

	const SUIT_NAMES: Record<string, string> = {
		'♠': 'Schoppen',
		'♥': 'Harten',
		'♣': 'Klaveren',
		'♦': 'Ruiten'
	};

	const RANK_NAMES: Record<string, string> = {
		'7': '7',
		'8': '8',
		'9': '9',
		'10': '10',
		J: 'Boer',
		Q: 'Vrouw',
		K: 'Heer',
		A: 'Aas'
	};

	let isRed = $derived(card.suit === '♥' || card.suit === '♦');
	let ariaLabel = $derived(
		faceUp ? `${RANK_NAMES[card.rank]} van ${SUIT_NAMES[card.suit]}` : 'Kaart (omgedraaid)'
	);

	function handleClick() {
		if (!disabled && onClick) {
			onClick();
		}
	}
</script>

{#if onClick}
	<button
		type="button"
		data-testid="card"
		aria-label={ariaLabel}
		onclick={handleClick}
		class="card relative flex aspect-[2/3] flex-col items-center justify-center rounded-lg border-2 border-gray-300 shadow-md transition-transform
			{faceUp ? 'bg-white' : 'bg-blue-800'}
			{selected ? 'ring-2 ring-yellow-400' : ''}
			{disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:-translate-y-1'}"
	>
		{#if faceUp}
			<span class="card-rank font-bold {isRed ? 'text-red-600' : 'text-gray-900'}">
				{card.rank}
			</span>
			<span class="card-suit {isRed ? 'text-red-600' : 'text-gray-900'}">
				{card.suit}
			</span>
		{/if}
	</button>
{:else}
	<div
		data-testid="card"
		aria-label={ariaLabel}
		role="img"
		class="card relative flex aspect-[2/3] flex-col items-center justify-center rounded-lg border-2 border-gray-300 shadow-md
			{faceUp ? 'bg-white' : 'bg-blue-800'}
			{selected ? 'ring-2 ring-yellow-400' : ''}
			{disabled ? 'opacity-50' : ''}"
	>
		{#if faceUp}
			<span class="card-rank font-bold {isRed ? 'text-red-600' : 'text-gray-900'}">
				{card.rank}
			</span>
			<span class="card-suit {isRed ? 'text-red-600' : 'text-gray-900'}">
				{card.suit}
			</span>
		{/if}
	</div>
{/if}

<style>
	.card {
		/* Default size - can be overridden by parent via CSS custom property */
		/* Using max() to ensure minimum readable size on small screens */
		height: var(--card-height, max(12vh, 60px));
	}

	.card-rank {
		font-size: var(--card-rank-size, max(2vh, 12px));
	}

	.card-suit {
		font-size: var(--card-suit-size, max(3vh, 16px));
	}
</style>
