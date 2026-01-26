<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { lobbyStore } from '$lib/stores/lobbyStore.svelte';
	import { multiplayerGameStore } from '$lib/stores/multiplayerGameStore.svelte';
	import type { Seat } from '$lib/multiplayer';
	import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
	import LobbyPlayerList from '$lib/components/LobbyPlayerList.svelte';

	let copied = $state(false);
	let isStarting = $state(false);

	onMount(() => {
		lobbyStore.initialize();

		// Redirect to home if not in a lobby
		if (!lobbyStore.isInLobby) {
			goto(base || '/');
		}
	});

	// Watch for game start and navigate to game page
	$effect(() => {
		if (lobbyStore.lobby?.status === 'playing') {
			// Subscribe to game updates before navigating
			if (lobbyStore.session) {
				multiplayerGameStore.subscribeToGame(lobbyStore.session.lobbyCode);
			}
			goto(`${base}/game`);
		}
	});

	async function handleLeave() {
		await lobbyStore.leaveGame();
		goto(base || '/');
	}

	async function handleChangeSeat(seat: Seat) {
		try {
			await lobbyStore.selectSeat(seat);
		} catch (err) {
			console.error('Failed to change seat:', err);
		}
	}

	async function handleStartGame() {
		if (isStarting) return;

		try {
			isStarting = true;
			await multiplayerGameStore.start();
			// Navigation will happen via the $effect watching lobby.status
		} catch (err) {
			console.error('Failed to start game:', err);
			isStarting = false;
		}
	}

	async function copyCode() {
		if (!lobbyStore.lobby) return;

		try {
			await navigator.clipboard.writeText(lobbyStore.lobby.code);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Fallback for browsers that don't support clipboard API
			alert(`Lobby code: ${lobbyStore.lobby.code}`);
		}
	}
</script>

<div class="min-h-screen bg-green-900 flex flex-col text-white">
	<!-- Header -->
	<header class="p-4 border-b border-green-700 flex items-center justify-between">
		<h1 class="text-xl font-bold">Klaverjas</h1>
		<ConnectionStatus status={lobbyStore.connectionStatus} />
	</header>

	<main class="flex-1 p-4 max-w-2xl mx-auto w-full">
		{#if lobbyStore.lobby && lobbyStore.session}
			<!-- Lobby Code -->
			<div class="text-center mb-8">
				<p class="text-green-400 text-sm mb-2">Share this code with other players:</p>
				<button
					onclick={copyCode}
					class="inline-flex items-center gap-2 px-6 py-3 bg-green-800 hover:bg-green-700 rounded-lg transition-colors"
				>
					<span class="text-3xl font-mono font-bold tracking-widest">
						{lobbyStore.lobby.code}
					</span>
					<span class="text-sm text-green-400">
						{copied ? 'Copied!' : 'Click to copy'}
					</span>
				</button>
			</div>

			<!-- Error Message -->
			{#if lobbyStore.error}
				<div class="mb-4 p-3 bg-red-600/80 rounded-lg text-white text-center">
					{lobbyStore.error}
				</div>
			{/if}

			<!-- Player List -->
			<div class="mb-8">
				<LobbyPlayerList
					lobby={lobbyStore.lobby}
					currentPlayerId={lobbyStore.session.playerId}
					onChangeSeat={handleChangeSeat}
				/>
			</div>

			<!-- Status -->
			<div class="text-center mb-6">
				{#if lobbyStore.canStartGame}
					<p class="text-green-400">All players are ready!</p>
				{:else}
					<p class="text-yellow-400">Waiting for players... ({lobbyStore.players.filter(p => typeof p.player.seat === 'number').length}/4)</p>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex flex-col gap-3 max-w-xs mx-auto">
				{#if lobbyStore.isHost}
					<button
						onclick={handleStartGame}
						disabled={!lobbyStore.canStartGame || isStarting}
						class="px-8 py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-xl rounded-lg transition-colors"
					>
						{isStarting ? 'Starting...' : 'Start Game'}
					</button>
				{:else}
					<p class="text-center text-gray-400 text-sm">
						Waiting for host to start the game...
					</p>
				{/if}

				<button
					onclick={handleLeave}
					class="px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
				>
					Leave Lobby
				</button>
			</div>
		{:else}
			<div class="text-center">
				<p class="text-gray-400">Loading lobby...</p>
			</div>
		{/if}
	</main>
</div>
