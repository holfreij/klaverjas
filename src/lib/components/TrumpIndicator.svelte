<script lang="ts">
	import type { Suit } from '$lib/game/deck';

	interface Props {
		trump: Suit | null;
		playingTeam?: 'NS' | 'WE' | null;
	}

	let { trump, playingTeam = null }: Props = $props();

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

	const teamLabels: Record<string, string> = {
		NS: 'Wij',
		WE: 'Zij',
	};
</script>

<div class="bg-green-900/80 rounded-lg px-3 py-2 flex items-center gap-3 text-sm">
	{#if trump}
		<div class="flex items-center gap-1">
			<span class="text-green-400">Troef:</span>
			<span class="text-3xl {suitColors[trump]}">{suitSymbols[trump]}</span>
		</div>
		{#if playingTeam}
			<div class="text-green-300 border-l border-green-700 pl-3">
				{teamLabels[playingTeam]} speelt
			</div>
		{/if}
	{:else}
		<span class="text-green-400">Geen troef gekozen</span>
	{/if}
</div>
