<script lang="ts">
	import { lobbyStore } from '$lib/stores/lobbyStore.svelte';

	let playerName = $state('');
	let lobbyCodeRaw = $state('');
	let isCreating = $state(false);
	let isJoining = $state(false);

	// Filter lobby code to only digits, max 6
	let lobbyCode = $derived(lobbyCodeRaw.replace(/\D/g, '').slice(0, 6));
	let canJoin = $derived(playerName.trim().length > 0 && lobbyCode.length === 6);

	async function handleCreate() {
		if (!playerName.trim()) return;
		isCreating = true;
		await lobbyStore.create(playerName);
		isCreating = false;
	}

	async function handleJoin() {
		if (!canJoin) return;
		isJoining = true;
		await lobbyStore.join(lobbyCode, playerName);
		isJoining = false;
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-green-900 p-4">
	<div class="w-full max-w-sm">
		<h1 class="mb-8 text-center text-4xl font-bold text-white">Klaverjas</h1>

		<!-- Player name input (shared) -->
		<div class="mb-6">
			<label for="playerName" class="mb-2 block text-sm text-green-300"> Jouw naam </label>
			<input
				id="playerName"
				type="text"
				bind:value={playerName}
				placeholder="Voer je naam in"
				maxlength="50"
				class="w-full rounded-lg border border-green-700 bg-green-800 px-4 py-3 text-white placeholder-green-500 focus:border-green-500 focus:outline-none"
			/>
		</div>

		<!-- Create lobby section -->
		<div class="mb-4 rounded-lg bg-green-800 p-4">
			<h2 class="mb-3 text-lg font-semibold text-white">Nieuw spel</h2>
			<button
				onclick={handleCreate}
				disabled={isCreating || !playerName.trim()}
				class="w-full rounded-lg bg-yellow-500 py-3 font-bold text-green-900 transition-colors hover:bg-yellow-400 disabled:bg-green-700 disabled:text-green-500"
			>
				{isCreating ? 'Bezig...' : 'Maak lobby'}
			</button>
		</div>

		<!-- Join lobby section -->
		<div class="rounded-lg bg-green-800 p-4">
			<h2 class="mb-3 text-lg font-semibold text-white">Deelnemen</h2>
			<div class="mb-3">
				<input
					id="lobbyCode"
					type="text"
					inputmode="numeric"
					bind:value={lobbyCodeRaw}
					placeholder="6-cijferige code"
					maxlength="12"
					class="w-full rounded-lg border border-green-600 bg-green-700 px-4 py-3 text-center font-mono text-xl tracking-widest text-white placeholder-green-500 focus:border-green-500 focus:outline-none"
				/>
			</div>
			<button
				onclick={handleJoin}
				disabled={isJoining || !canJoin}
				class="w-full rounded-lg bg-green-600 py-3 font-bold text-white transition-colors hover:bg-green-500 disabled:bg-green-700 disabled:text-green-500"
			>
				{isJoining ? 'Bezig...' : 'Deelnemen'}
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

		<!-- Connection status -->
		{#if lobbyStore.connectionState === 'connecting'}
			<div class="mt-4 text-center text-sm text-green-400">Verbinding maken...</div>
		{:else if lobbyStore.connectionState === 'reconnecting'}
			<div class="mt-4 text-center text-sm text-green-400">Opnieuw verbinden...</div>
		{/if}
	</div>
</div>
