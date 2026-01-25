<script lang="ts">
	import type { TeamScores, Team } from '$lib/game/scoring';

	interface Props {
		scores: TeamScores;
		round: number;
		totalRounds?: number;
		playingTeam?: Team | null;
		roundScores?: TeamScores;
	}

	let {
		scores,
		round,
		totalRounds = 16,
		playingTeam = null,
		roundScores,
	}: Props = $props();
</script>

<div class="bg-green-900/80 rounded-lg p-3 text-sm min-w-48">
	<div class="text-center text-green-400 mb-2">
		Round {round} / {totalRounds}
	</div>

	<div class="grid grid-cols-3 gap-2 text-center">
		<div class="text-green-300">Team</div>
		<div class="text-green-300">Game</div>
		{#if roundScores}
			<div class="text-green-300">Round</div>
		{:else}
			<div></div>
		{/if}

		<div class="font-bold {playingTeam === 'NS' ? 'text-amber-400' : 'text-white'}">
			N-S
		</div>
		<div class="text-white font-mono">{scores.NS}</div>
		{#if roundScores}
			<div class="text-green-200 font-mono">+{roundScores.NS}</div>
		{:else}
			<div></div>
		{/if}

		<div class="font-bold {playingTeam === 'WE' ? 'text-amber-400' : 'text-white'}">
			W-E
		</div>
		<div class="text-white font-mono">{scores.WE}</div>
		{#if roundScores}
			<div class="text-green-200 font-mono">+{roundScores.WE}</div>
		{:else}
			<div></div>
		{/if}
	</div>
</div>
