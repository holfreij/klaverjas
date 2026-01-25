<script lang="ts">
	import type { Card as CardType } from '$lib/game/deck';
	import Card from './Card.svelte';

	interface Props {
		cards: CardType[];
		legalCards?: CardType[];
		selectedCard?: CardType | null;
		onCardSelect?: (card: CardType) => void;
		faceUp?: boolean;
		position?: 'bottom' | 'top' | 'left' | 'right';
	}

	let {
		cards,
		legalCards = [],
		selectedCard = null,
		onCardSelect,
		faceUp = true,
		position = 'bottom',
	}: Props = $props();

	function isLegal(card: CardType): boolean {
		if (legalCards.length === 0) return true;
		return legalCards.some((c) => c.suit === card.suit && c.rank === card.rank);
	}

	function isSelected(card: CardType): boolean {
		return selectedCard?.suit === card.suit && selectedCard?.rank === card.rank;
	}

	function handleCardClick(card: CardType) {
		if (onCardSelect && isLegal(card)) {
			onCardSelect(card);
		}
	}

	// Positioning classes based on position prop
	const containerClasses: Record<string, string> = {
		bottom: 'flex-row',
		top: 'flex-row rotate-180',
		left: 'flex-col',
		right: 'flex-col',
	};

	// Overlap calculation for fan effect (derived to be reactive)
	let overlapClass = $derived(position === 'left' || position === 'right' ? '-mt-12' : '-ml-8');
</script>

<div class="flex {containerClasses[position]} items-center justify-center">
	{#each cards as card, i (card.suit + card.rank)}
		<div class="{i > 0 ? overlapClass : ''} transition-transform duration-150">
			<Card
				{card}
				{faceUp}
				selected={isSelected(card)}
				disabled={faceUp && !isLegal(card)}
				size={faceUp ? 'medium' : 'small'}
				onclick={() => handleCardClick(card)}
			/>
		</div>
	{/each}
</div>
