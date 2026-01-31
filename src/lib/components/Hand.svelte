<script lang="ts">
	import type { Card as CardType, Suit } from '$lib/game/deck';
	import { SUITS } from '$lib/game/deck';
	import Card from './Card.svelte';

	interface Props {
		cards: CardType[];
		trump: Suit;
		onCardPlay: (card: CardType) => void;
		disabled?: boolean;
	}

	let { cards, trump, onCardPlay, disabled = false }: Props = $props();

	// Non-trump rank order (high to low): A-10-K-Q-J-9-8-7
	const NON_TRUMP_RANK_ORDER: Record<string, number> = {
		A: 0,
		'10': 1,
		K: 2,
		Q: 3,
		J: 4,
		'9': 5,
		'8': 6,
		'7': 7
	};

	// Trump rank order (high to low): J-9-A-10-K-Q-8-7
	const TRUMP_RANK_ORDER: Record<string, number> = {
		J: 0,
		'9': 1,
		A: 2,
		'10': 3,
		K: 4,
		Q: 5,
		'8': 6,
		'7': 7
	};

	let sortedCards = $derived.by(() => {
		const sorted = [...cards];
		sorted.sort((a, b) => {
			// First by suit order
			const suitDiff = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
			if (suitDiff !== 0) return suitDiff;

			// Then by rank order (depends on whether it's trump)
			const isTrumpSuit = a.suit === trump;
			const rankOrder = isTrumpSuit ? TRUMP_RANK_ORDER : NON_TRUMP_RANK_ORDER;
			return rankOrder[a.rank] - rankOrder[b.rank];
		});
		return sorted;
	});
</script>

<section aria-label="Jouw kaarten" class="hand-container flex justify-center gap-[0.5vh] p-1">
	{#each sortedCards as card (card.suit + card.rank)}
		<Card {card} {disabled} onClick={() => onCardPlay(card)} />
	{/each}
</section>

<style>
	.hand-container {
		--card-height: max(13vh, 65px);
		--card-rank-size: max(2vh, 14px);
		--card-suit-size: max(2.8vh, 18px);
	}
</style>
