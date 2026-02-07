<script lang="ts">
	import { lobbyStore } from '$lib/stores/lobbyStore.svelte';
	import { SEAT_NAMES, type PlayerSeat, type Seat } from '$lib/multiplayer/types';

	function handleSeatClick(seat: Seat) {
		lobbyStore.switchSeat(seat);
	}

	function handleLeave() {
		lobbyStore.leave();
	}

	async function handleStart() {
		await lobbyStore.start();
	}

	function copyLobbyCode() {
		if (lobbyStore.lobby?.code) {
			navigator.clipboard.writeText(lobbyStore.lobby.code);
		}
	}
</script>

<div class="min-h-screen bg-green-900 p-4">
	<div class="mx-auto max-w-2xl">
		<!-- Header with lobby code -->
		<div class="mb-6 rounded-lg bg-green-800 p-4 text-center">
			<p class="mb-1 text-sm text-green-300">Lobby code</p>
			<button
				onclick={copyLobbyCode}
				class="font-mono text-3xl font-bold tracking-widest text-white transition-colors hover:text-green-200"
				title="Klik om te kopieren"
			>
				{lobbyStore.lobby?.code}
			</button>
			<p class="mt-1 text-xs text-green-400">Klik om te kopieren</p>
		</div>

		<!-- Card table with seats -->
		<div
			class="relative mx-auto aspect-square max-w-md rounded-xl border-4 border-green-600 bg-green-700 p-8 shadow-xl"
		>
			<!-- Center info -->
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="text-center">
					<p class="text-sm text-green-300">{lobbyStore.playerCount}/4 spelers</p>
					{#if lobbyStore.canStart && lobbyStore.isHost}
						<button
							onclick={handleStart}
							class="mt-2 rounded-lg bg-yellow-500 px-6 py-2 font-bold text-green-900 transition-colors hover:bg-yellow-400"
						>
							Start spel
						</button>
					{:else if !lobbyStore.canStart}
						<p class="mt-2 text-xs text-green-400">Wacht op meer spelers...</p>
					{:else if !lobbyStore.isHost}
						<p class="mt-2 text-xs text-green-400">Wacht op host om te starten</p>
					{/if}
				</div>
			</div>

			<!-- Seat positions -->
			<!-- Zuid (bottom) - seat 0 -->
			<div class="absolute bottom-2 left-1/2 -translate-x-1/2">
				{@render seatButton(0)}
			</div>

			<!-- West (left) - seat 1 -->
			<div class="absolute top-1/2 left-2 -translate-y-1/2">
				{@render seatButton(1)}
			</div>

			<!-- Noord (top) - seat 2 -->
			<div class="absolute top-2 left-1/2 -translate-x-1/2">
				{@render seatButton(2)}
			</div>

			<!-- Oost (right) - seat 3 -->
			<div class="absolute top-1/2 right-2 -translate-y-1/2">
				{@render seatButton(3)}
			</div>
		</div>

		<!-- Table device option -->
		<div class="mt-4 text-center">
			{@render tableButton()}
		</div>

		<!-- Leave button -->
		<div class="mt-6 text-center">
			<button onclick={handleLeave} class="text-sm text-green-400 underline hover:text-green-200">
				Verlaat lobby
			</button>
		</div>

		<!-- Error message -->
		{#if lobbyStore.error}
			<div class="mt-4 rounded-lg border border-red-500 bg-red-500/20 p-3 text-center text-red-200">
				{lobbyStore.error}
				<button onclick={() => lobbyStore.clearError()} class="ml-2 text-red-300 hover:text-white">
					&times;
				</button>
			</div>
		{/if}
	</div>
</div>

{#snippet seatButton(seat: PlayerSeat)}
	{@const playerAtSeat = lobbyStore.getPlayerAtSeat(seat)}
	{@const isCurrentPlayer = playerAtSeat?.playerId === lobbyStore.playerId}
	{@const isHost = playerAtSeat?.playerId === lobbyStore.lobby?.host}

	<button
		onclick={() => handleSeatClick(seat)}
		class="flex h-20 w-24 flex-col items-center justify-center rounded-lg transition-all
			{playerAtSeat
			? isCurrentPlayer
				? 'bg-yellow-500 text-green-900'
				: 'bg-green-600 text-white hover:bg-green-500'
			: 'border-2 border-dashed border-green-600 bg-green-800 text-green-400 hover:bg-green-600'}"
	>
		<span class="text-xs font-medium opacity-75">{SEAT_NAMES[seat]}</span>
		{#if playerAtSeat}
			<span class="max-w-20 truncate px-1 text-sm font-bold">
				{playerAtSeat.player.name}
			</span>
			{#if isHost}
				<span class="text-xs opacity-75">Host</span>
			{/if}
		{:else}
			<span class="text-xs">Leeg</span>
		{/if}
	</button>
{/snippet}

{#snippet tableButton()}
	{@const tablePlayer = lobbyStore.getPlayerAtSeat('table')}
	{@const isCurrentPlayer = tablePlayer?.playerId === lobbyStore.playerId}

	<button
		onclick={() => handleSeatClick('table')}
		class="rounded-lg px-4 py-2 text-sm transition-all
			{tablePlayer
			? isCurrentPlayer
				? 'bg-yellow-500 text-green-900'
				: 'bg-green-700 text-white'
			: 'border border-dashed border-green-600 bg-green-800 text-green-400 hover:bg-green-700'}"
	>
		Tafel
		{#if tablePlayer}
			<span class="ml-1 font-bold">{tablePlayer.player.name}</span>
		{/if}
	</button>
{/snippet}
