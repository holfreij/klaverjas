<script lang="ts">
	import { onMount } from 'svelte';
	import { lobbyStore } from '$lib/stores/lobbyStore.svelte';
	import HomePage from '$lib/components/HomePage.svelte';
	import LobbyRoom from '$lib/components/LobbyRoom.svelte';

	onMount(async () => {
		// Try to reconnect to previous session
		await lobbyStore.tryReconnect();
	});
</script>

{#if lobbyStore.isInLobby}
	<LobbyRoom />
{:else}
	<HomePage />
{/if}
