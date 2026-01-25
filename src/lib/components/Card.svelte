<script lang="ts">
	import type { Card } from '$lib/game/deck';

	interface Props {
		card: Card;
		faceUp?: boolean;
		selected?: boolean;
		disabled?: boolean;
		size?: 'small' | 'medium' | 'large';
		onclick?: () => void;
	}

	let { card, faceUp = true, selected = false, disabled = false, size = 'medium', onclick }: Props = $props();

	const suitSymbols: Record<string, string> = {
		Harten: '♥',
		Ruiten: '♦',
		Klaver: '♣',
		Schoppen: '♠',
	};

	const suitColors: Record<string, string> = {
		Harten: 'text-red-600',
		Ruiten: 'text-red-600',
		Klaver: 'text-gray-900',
		Schoppen: 'text-gray-900',
	};

	const sizeClasses: Record<string, string> = {
		small: 'w-8 h-11 text-xs',
		medium: 'w-14 h-20 text-sm',
		large: 'w-20 h-28 text-base',
	};
</script>

{#if faceUp}
	<button
		type="button"
		class="
			{sizeClasses[size]}
			rounded-lg border-2 bg-white shadow-md
			flex flex-col items-center justify-between p-1
			transition-all duration-150
			{suitColors[card.suit]}
			{selected ? 'ring-2 ring-amber-400 -translate-y-2 shadow-lg' : ''}
			{disabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-lg cursor-pointer'}
			{onclick && !disabled ? 'active:translate-y-0' : ''}
		"
		onclick={disabled ? undefined : onclick}
		{disabled}
	>
		<div class="w-full text-left font-bold leading-none">{card.rank}</div>
		<div class="text-2xl leading-none {size === 'small' ? 'text-lg' : size === 'large' ? 'text-3xl' : ''}">{suitSymbols[card.suit]}</div>
		<div class="w-full text-right font-bold leading-none rotate-180">{card.rank}</div>
	</button>
{:else}
	<div
		class="
			{sizeClasses[size]}
			rounded-lg border-2 border-blue-800 shadow-md
			bg-gradient-to-br from-blue-700 to-blue-900
			flex items-center justify-center
		"
	>
		<div class="w-3/4 h-3/4 rounded border border-blue-600 bg-blue-800 flex items-center justify-center">
			<span class="text-blue-400 text-lg font-bold">K</span>
		</div>
	</div>
{/if}
