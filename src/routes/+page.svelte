<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { lobbyStore } from '$lib/stores/lobbyStore.svelte';
	import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';

	let mode: 'menu' | 'host' | 'join' = $state('menu');
	let playerName = $state('');
	let lobbyCode = $state('');
	let isLoading = $state(false);

	onMount(() => {
		lobbyStore.initialize();

		// If already in a lobby, redirect to lobby page
		if (lobbyStore.isInLobby) {
			goto(`${base}/lobby`);
		}
	});

	async function handleHost() {
		if (!playerName.trim()) return;

		isLoading = true;
		try {
			await lobbyStore.hostGame(playerName.trim());
			goto(`${base}/lobby`);
		} catch (err) {
			console.error('Failed to host game:', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleJoin() {
		if (!playerName.trim() || !lobbyCode.trim()) return;

		isLoading = true;
		try {
			await lobbyStore.joinGame(lobbyCode.trim(), playerName.trim());
			goto(`${base}/lobby`);
		} catch (err) {
			console.error('Failed to join game:', err);
		} finally {
			isLoading = false;
		}
	}

	function handleBack() {
		mode = 'menu';
		lobbyStore.clearError();
	}
</script>

<div class="min-h-screen bg-green-900 flex flex-col items-center justify-center text-white p-4">
	<div class="absolute top-4 right-4">
		<ConnectionStatus status={lobbyStore.connectionStatus} />
	</div>

	<h1 class="text-4xl font-bold mb-4">Klaverjas</h1>
	<p class="text-lg text-green-200 mb-8">Online multiplayer card game</p>

	{#if lobbyStore.error}
		<div class="mb-4 p-3 bg-red-600/80 rounded-lg text-white max-w-sm text-center">
			{lobbyStore.error}
		</div>
	{/if}

	{#if mode === 'menu'}
		<div class="flex flex-col gap-4 w-full max-w-xs">
			<button
				onclick={() => (mode = 'host')}
				class="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xl rounded-lg transition-colors"
			>
				Host Game
			</button>

			<button
				onclick={() => (mode = 'join')}
				class="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl rounded-lg transition-colors"
			>
				Join Game
			</button>

			<a
				href="{base}/play"
				class="px-8 py-4 bg-green-700 hover:bg-green-600 text-white font-bold text-xl rounded-lg transition-colors text-center"
			>
				Local Play
			</a>
		</div>
	{:else if mode === 'host'}
		<div class="w-full max-w-sm space-y-4">
			<h2 class="text-2xl font-semibold text-center">Host a Game</h2>

			<input
				type="text"
				bind:value={playerName}
				placeholder="Your name"
				class="w-full px-4 py-3 rounded-lg bg-green-800 border border-green-600 text-white placeholder-green-400 focus:outline-none focus:border-amber-500"
				maxlength="20"
			/>

			<button
				onclick={handleHost}
				disabled={!playerName.trim() || isLoading}
				class="w-full px-8 py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-xl rounded-lg transition-colors"
			>
				{isLoading ? 'Creating...' : 'Create Lobby'}
			</button>

			<button
				onclick={handleBack}
				class="w-full px-4 py-2 text-green-300 hover:text-white transition-colors"
			>
				Back
			</button>
		</div>
	{:else if mode === 'join'}
		<div class="w-full max-w-sm space-y-4">
			<h2 class="text-2xl font-semibold text-center">Join a Game</h2>

			<input
				type="text"
				bind:value={playerName}
				placeholder="Your name"
				class="w-full px-4 py-3 rounded-lg bg-green-800 border border-green-600 text-white placeholder-green-400 focus:outline-none focus:border-amber-500"
				maxlength="20"
			/>

			<input
				type="text"
				bind:value={lobbyCode}
				placeholder="Lobby code (e.g., ABC123)"
				class="w-full px-4 py-3 rounded-lg bg-green-800 border border-green-600 text-white placeholder-green-400 focus:outline-none focus:border-amber-500 uppercase tracking-widest text-center text-xl"
				maxlength="6"
			/>

			<button
				onclick={handleJoin}
				disabled={!playerName.trim() || !lobbyCode.trim() || isLoading}
				class="w-full px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-xl rounded-lg transition-colors"
			>
				{isLoading ? 'Joining...' : 'Join Lobby'}
			</button>

			<button
				onclick={handleBack}
				class="w-full px-4 py-2 text-green-300 hover:text-white transition-colors"
			>
				Back
			</button>
		</div>
	{/if}

	<p class="mt-8 text-sm text-green-400">Rotterdam rules</p>
</div>
