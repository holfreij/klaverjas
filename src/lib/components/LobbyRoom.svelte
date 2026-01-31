<script lang="ts">
	import { lobbyStore } from '$lib/stores/lobbyStore.svelte';
	import { SEAT_NAMES, type PlayerSeat, type Seat } from '$lib/multiplayer/types';

	const seats: PlayerSeat[] = [0, 1, 2, 3];

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
	<div class="max-w-2xl mx-auto">
		<!-- Header with lobby code -->
		<div class="bg-green-800 rounded-lg p-4 mb-6 text-center">
			<p class="text-green-300 text-sm mb-1">Lobby code</p>
			<button
				onclick={copyLobbyCode}
				class="text-3xl font-mono font-bold text-white tracking-widest hover:text-green-200 transition-colors"
				title="Klik om te kopieren"
			>
				{lobbyStore.lobby?.code}
			</button>
			<p class="text-green-400 text-xs mt-1">Klik om te kopieren</p>
		</div>

		<!-- Card table with seats -->
		<div class="relative bg-green-700 rounded-xl p-8 aspect-square max-w-md mx-auto shadow-xl border-4 border-green-600">
			<!-- Center info -->
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="text-center">
					{#if lobbyStore.lobby?.status === 'playing'}
						<p class="text-yellow-400 font-bold">Spel gestart!</p>
						<p class="text-green-300 text-xs mt-1">Game UI komt binnenkort...</p>
					{:else}
						<p class="text-green-300 text-sm">{lobbyStore.playerCount}/4 spelers</p>
						{#if lobbyStore.canStart && lobbyStore.isHost}
							<button
								onclick={handleStart}
								class="mt-2 bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold px-6 py-2 rounded-lg transition-colors"
							>
								Start spel
							</button>
						{:else if !lobbyStore.canStart}
							<p class="text-green-400 text-xs mt-2">Wacht op meer spelers...</p>
						{:else if !lobbyStore.isHost}
							<p class="text-green-400 text-xs mt-2">Wacht op host om te starten</p>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Seat positions -->
			<!-- Zuid (bottom) - seat 0 -->
			<div class="absolute bottom-2 left-1/2 -translate-x-1/2">
				{@render seatButton(0)}
			</div>

			<!-- West (left) - seat 1 -->
			<div class="absolute left-2 top-1/2 -translate-y-1/2">
				{@render seatButton(1)}
			</div>

			<!-- Noord (top) - seat 2 -->
			<div class="absolute top-2 left-1/2 -translate-x-1/2">
				{@render seatButton(2)}
			</div>

			<!-- Oost (right) - seat 3 -->
			<div class="absolute right-2 top-1/2 -translate-y-1/2">
				{@render seatButton(3)}
			</div>
		</div>

		<!-- Table device option -->
		<div class="mt-4 text-center">
			{@render tableButton()}
		</div>

		<!-- Leave button -->
		<div class="mt-6 text-center">
			<button
				onclick={handleLeave}
				class="text-green-400 hover:text-green-200 underline text-sm"
			>
				Verlaat lobby
			</button>
		</div>

		<!-- Error message -->
		{#if lobbyStore.error}
			<div class="mt-4 bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-200 text-center">
				{lobbyStore.error}
				<button
					onclick={() => lobbyStore.clearError()}
					class="ml-2 text-red-300 hover:text-white"
				>
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
		class="w-24 h-20 rounded-lg flex flex-col items-center justify-center transition-all
			{playerAtSeat
				? isCurrentPlayer
					? 'bg-yellow-500 text-green-900'
					: 'bg-green-600 text-white hover:bg-green-500'
				: 'bg-green-800 text-green-400 hover:bg-green-600 border-2 border-dashed border-green-600'}"
	>
		<span class="text-xs font-medium opacity-75">{SEAT_NAMES[seat]}</span>
		{#if playerAtSeat}
			<span class="font-bold text-sm truncate max-w-20 px-1">
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
		class="px-4 py-2 rounded-lg text-sm transition-all
			{tablePlayer
				? isCurrentPlayer
					? 'bg-yellow-500 text-green-900'
					: 'bg-green-700 text-white'
				: 'bg-green-800 text-green-400 hover:bg-green-700 border border-dashed border-green-600'}"
	>
		Tafel
		{#if tablePlayer}
			<span class="font-bold ml-1">{tablePlayer.player.name}</span>
		{/if}
	</button>
{/snippet}
