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

<div class="min-h-screen bg-green-900 flex items-center justify-center p-4">
	<div class="w-full max-w-sm">
		<h1 class="text-4xl font-bold text-white text-center mb-8">Klaverjas</h1>

		<!-- Player name input (shared) -->
		<div class="mb-6">
			<label for="playerName" class="block text-green-300 text-sm mb-2">
				Jouw naam
			</label>
			<input
				id="playerName"
				type="text"
				bind:value={playerName}
				placeholder="Voer je naam in"
				maxlength="50"
				class="w-full px-4 py-3 rounded-lg bg-green-800 text-white placeholder-green-500 border border-green-700 focus:border-green-500 focus:outline-none"
			/>
		</div>

		<!-- Create lobby section -->
		<div class="bg-green-800 rounded-lg p-4 mb-4">
			<h2 class="text-lg font-semibold text-white mb-3">Nieuw spel</h2>
			<button
				onclick={handleCreate}
				disabled={isCreating || !playerName.trim()}
				class="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-green-700 disabled:text-green-500 text-green-900 font-bold py-3 rounded-lg transition-colors"
			>
				{isCreating ? 'Bezig...' : 'Maak lobby'}
			</button>
		</div>

		<!-- Join lobby section -->
		<div class="bg-green-800 rounded-lg p-4">
			<h2 class="text-lg font-semibold text-white mb-3">Deelnemen</h2>
			<div class="mb-3">
				<input
					id="lobbyCode"
					type="text"
					inputmode="numeric"
					bind:value={lobbyCodeRaw}
					placeholder="6-cijferige code"
					maxlength="12"
					class="w-full px-4 py-3 rounded-lg bg-green-700 text-white text-center text-xl tracking-widest font-mono placeholder-green-500 border border-green-600 focus:border-green-500 focus:outline-none"
				/>
			</div>
			<button
				onclick={handleJoin}
				disabled={isJoining || !canJoin}
				class="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-700 disabled:text-green-500 text-white font-bold py-3 rounded-lg transition-colors"
			>
				{isJoining ? 'Bezig...' : 'Deelnemen'}
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

		<!-- Connection status -->
		{#if lobbyStore.connectionState === 'connecting'}
			<div class="mt-4 text-green-400 text-center text-sm">
				Verbinding maken...
			</div>
		{:else if lobbyStore.connectionState === 'reconnecting'}
			<div class="mt-4 text-green-400 text-center text-sm">
				Opnieuw verbinden...
			</div>
		{/if}
	</div>
</div>
