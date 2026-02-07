<script lang="ts">
	import { onMount } from 'svelte';
	import { lobbyStore } from '$lib/stores/lobbyStore.svelte';
	import HomePage from '$lib/components/HomePage.svelte';
	import LobbyRoom from '$lib/components/LobbyRoom.svelte';
	import GameView from '$lib/components/GameView.svelte';

	onMount(async () => {
		// Try to reconnect to previous session
		await lobbyStore.tryReconnect();
	});

	let isPlaying = $derived(
		lobbyStore.isInLobby && lobbyStore.lobby?.status === 'playing' && lobbyStore.lobby?.game != null
	);
</script>

{#if isPlaying}
	<GameView />
{:else if lobbyStore.isInLobby}
	<LobbyRoom />
{:else}
	<HomePage />
{/if}
