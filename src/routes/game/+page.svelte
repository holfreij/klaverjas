<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { Hand, Table, TrumpIndicator, TrumpSelector, ScoreDisplay } from '$lib/components';
	import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
	import { lobbyStore } from '$lib/stores/lobbyStore.svelte';
	import { multiplayerGameStore } from '$lib/stores/multiplayerGameStore.svelte';
	import type { Card } from '$lib/game/deck';
	import type { PlayedCard } from '$lib/game/rules';

	// Get player names from lobby
	function getPlayerName(seat: number): string {
		const seatNames = ['Zuid', 'West', 'Noord', 'Oost'];
		if (!lobbyStore.lobby) return seatNames[seat];

		for (const [playerId, player] of Object.entries(lobbyStore.lobby.players)) {
			if (player.seat === seat) {
				const name = player.name;
				// Add "(Jij)" indicator for the current player
				if (playerId === lobbyStore.session?.playerId) {
					return `${name} (Jij)`;
				}
				return name;
			}
		}
		return seatNames[seat];
	}

	// Convert MultiplayerPlayedCard to PlayedCard for Table component
	function convertTrickForTable(trick: typeof multiplayerGameStore.currentTrick): PlayedCard[] {
		return trick.map((pc) => ({
			card: pc.card,
			player: pc.seat,
		}));
	}

	// Sort cards for display: group by suit, then by rank
	function sortHand(cards: Card[]): Card[] {
		const suitOrder = ['Schoppen', 'Harten', 'Klaver', 'Ruiten'];
		const rankOrder = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];

		return [...cards].sort((a, b) => {
			const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
			if (suitDiff !== 0) return suitDiff;
			return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
		});
	}

	// Handle card selection
	function handleCardSelect(card: Card) {
		if (!multiplayerGameStore.isMyTurn) return;
		if (!multiplayerGameStore.isLegalMove(card)) return;

		multiplayerGameStore.playCard(card);
	}

	// Handle trump selection
	function handleTrumpSelect(suit: typeof multiplayerGameStore.trump) {
		if (!multiplayerGameStore.isMyTurn || !suit) return;
		multiplayerGameStore.chooseTrump(suit);
	}

	// Handle rematch
	function handleRematch() {
		multiplayerGameStore.rematch();
	}

	// Handle leave game
	async function handleLeave() {
		multiplayerGameStore.destroy();
		await lobbyStore.leaveGame();
		goto(base || '/');
	}

	// Get fake cards for face-down hands (just need count)
	function getFaceDownCards(count: number): Card[] {
		const fakeCards: Card[] = [];
		for (let i = 0; i < count; i++) {
			fakeCards.push({ suit: 'Schoppen', rank: '7' });
		}
		return fakeCards;
	}

	let isInitializing = $state(true);

	onMount(async () => {
		try {
			const wasInLobby = await lobbyStore.initialize();
			isInitializing = false;

			if (!wasInLobby || !lobbyStore.isInLobby) {
				// Not in a lobby, redirect to home
				goto(base || '/');
				return;
			}

			// If lobby is in waiting state, go to lobby page
			if (lobbyStore.lobby?.status === 'waiting') {
				goto(`${base}/lobby`);
				return;
			}

			// Subscribe to game state if not already subscribed
			if (lobbyStore.session && !multiplayerGameStore.game) {
				multiplayerGameStore.subscribeToGame(lobbyStore.session.lobbyCode);
			}
		} catch (err) {
			console.error('Failed to initialize game page:', err);
			isInitializing = false;
			goto(base || '/');
		}
	});

	onDestroy(() => {
		// Don't destroy store on navigate - might come back
	});

	// Watch for lobby status changes (e.g., rematch returns to waiting)
	$effect(() => {
		if (lobbyStore.lobby?.status === 'waiting') {
			goto(`${base}/lobby`);
		}
	});

	// Computed values
	let playerNames = $derived([
		getPlayerName(0),
		getPlayerName(1),
		getPlayerName(2),
		getPlayerName(3),
	]);

	let mySeat = $derived(multiplayerGameStore.mySeat);
</script>

<svelte:head>
	<title>Klaverjas - Game</title>
</svelte:head>

<div class="min-h-screen bg-green-900 flex flex-col">
	<!-- Header -->
	<header class="flex items-center justify-between p-3 bg-green-950">
		<h1 class="text-white font-bold text-xl">Klaverjas</h1>
		<div class="flex items-center gap-3">
			<ConnectionStatus status={lobbyStore.connectionStatus} />
			<ScoreDisplay
				scores={multiplayerGameStore.scores}
				round={multiplayerGameStore.round}
				playingTeam={multiplayerGameStore.playingTeam}
			/>
		</div>
	</header>

	<!-- Error message -->
	{#if multiplayerGameStore.error}
		<div class="p-2 bg-red-600 text-white text-center">
			{multiplayerGameStore.error}
			<button
				class="ml-2 underline"
				onclick={() => multiplayerGameStore.clearError()}
			>
				Dismiss
			</button>
		</div>
	{/if}

	<!-- Loading state -->
	{#if isInitializing || !multiplayerGameStore.game}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-green-400">{isInitializing ? 'Verbinden...' : 'Spel laden...'}</p>
		</div>
	{:else}
		<!-- Game finished overlay -->
		{#if multiplayerGameStore.isGameOver}
			<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
				<div class="bg-green-800 rounded-lg p-8 text-center">
					<h2 class="text-3xl font-bold text-white mb-4">Spel Afgelopen!</h2>
					<div class="text-xl text-green-200 mb-6">
						{#if multiplayerGameStore.scores.NS > multiplayerGameStore.scores.WE}
							Wij winnen!
						{:else if multiplayerGameStore.scores.WE > multiplayerGameStore.scores.NS}
							Zij winnen!
						{:else}
							Gelijkspel!
						{/if}
					</div>
					<div class="text-lg text-white mb-6">
						Eindstand: Wij {multiplayerGameStore.scores.NS} - Zij {multiplayerGameStore.scores.WE}
					</div>
					<div class="flex gap-3 justify-center">
						{#if lobbyStore.isHost}
							<button
								type="button"
								class="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold"
								onclick={handleRematch}
							>
								Opnieuw Spelen
							</button>
						{:else}
							<p class="text-green-300 text-sm">Wachten tot de host opnieuw start...</p>
						{/if}
						<button
							type="button"
							class="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
							onclick={handleLeave}
						>
							Verlaten
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Trump selector (shown during trump phase for current player) -->
		{#if multiplayerGameStore.isTrumpPhase}
			<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
				{#if multiplayerGameStore.isMyTurn}
					<TrumpSelector
						playerName={playerNames[multiplayerGameStore.currentPlayer ?? 0]}
						onSelect={handleTrumpSelect}
					/>
				{:else}
					<div class="bg-green-800 rounded-lg p-6 text-center">
						<p class="text-white text-xl">
							{playerNames[multiplayerGameStore.currentPlayer ?? 0]} kiest troef...
						</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Main game area -->
		<main class="flex-1 flex flex-col items-center justify-center p-4 gap-4">
			<!-- North hand (Seat 2) -->
			<div class="flex flex-col items-center">
				<span class="text-green-300 text-sm mb-1 {multiplayerGameStore.currentPlayer === 2 ? 'text-amber-400 font-bold' : ''}">
					{playerNames[2]}
					{#if mySeat !== 2}
						<span class="text-green-500">({multiplayerGameStore.getHandCount(2)} kaarten)</span>
					{/if}
				</span>
				{#if mySeat === 2}
					<Hand
						cards={sortHand(multiplayerGameStore.myHand)}
						legalCards={multiplayerGameStore.isMyTurn ? multiplayerGameStore.myLegalMoves : []}
						onCardSelect={multiplayerGameStore.isMyTurn && multiplayerGameStore.isPlayingPhase ? handleCardSelect : undefined}
						faceUp={true}
					/>
				{:else}
					<Hand
						cards={getFaceDownCards(multiplayerGameStore.getHandCount(2))}
						faceUp={false}
					/>
				{/if}
			</div>

			<!-- Middle row: West, Table, East -->
			<div class="flex items-center justify-center gap-8">
				<!-- West hand (Seat 1) -->
				<div class="flex flex-col items-center">
					<span class="text-green-300 text-sm mb-1 {multiplayerGameStore.currentPlayer === 1 ? 'text-amber-400 font-bold' : ''}">
						{playerNames[1]}
						{#if mySeat !== 1}
							<span class="text-green-500">({multiplayerGameStore.getHandCount(1)})</span>
						{/if}
					</span>
					{#if mySeat === 1}
						<Hand
							cards={sortHand(multiplayerGameStore.myHand)}
							legalCards={multiplayerGameStore.isMyTurn ? multiplayerGameStore.myLegalMoves : []}
							onCardSelect={multiplayerGameStore.isMyTurn && multiplayerGameStore.isPlayingPhase ? handleCardSelect : undefined}
							faceUp={true}
						/>
					{:else}
						<Hand
							cards={getFaceDownCards(multiplayerGameStore.getHandCount(1))}
							faceUp={false}
						/>
					{/if}
				</div>

				<!-- Table/Trick area -->
				<Table
					currentTrick={convertTrickForTable(multiplayerGameStore.currentTrick)}
					trump={multiplayerGameStore.trump}
					currentPlayer={multiplayerGameStore.currentPlayer ?? 0}
					{playerNames}
				/>

				<!-- East hand (Seat 3) -->
				<div class="flex flex-col items-center">
					<span class="text-green-300 text-sm mb-1 {multiplayerGameStore.currentPlayer === 3 ? 'text-amber-400 font-bold' : ''}">
						{playerNames[3]}
						{#if mySeat !== 3}
							<span class="text-green-500">({multiplayerGameStore.getHandCount(3)})</span>
						{/if}
					</span>
					{#if mySeat === 3}
						<Hand
							cards={sortHand(multiplayerGameStore.myHand)}
							legalCards={multiplayerGameStore.isMyTurn ? multiplayerGameStore.myLegalMoves : []}
							onCardSelect={multiplayerGameStore.isMyTurn && multiplayerGameStore.isPlayingPhase ? handleCardSelect : undefined}
							faceUp={true}
						/>
					{:else}
						<Hand
							cards={getFaceDownCards(multiplayerGameStore.getHandCount(3))}
							faceUp={false}
						/>
					{/if}
				</div>
			</div>

			<!-- South hand (Seat 0) -->
			<div class="flex flex-col items-center">
				<span class="text-green-300 text-sm mb-1 {multiplayerGameStore.currentPlayer === 0 ? 'text-amber-400 font-bold' : ''}">
					{playerNames[0]}
					{#if mySeat !== 0}
						<span class="text-green-500">({multiplayerGameStore.getHandCount(0)} kaarten)</span>
					{/if}
				</span>
				{#if mySeat === 0}
					<Hand
						cards={sortHand(multiplayerGameStore.myHand)}
						legalCards={multiplayerGameStore.isMyTurn ? multiplayerGameStore.myLegalMoves : []}
						onCardSelect={multiplayerGameStore.isMyTurn && multiplayerGameStore.isPlayingPhase ? handleCardSelect : undefined}
						faceUp={true}
					/>
				{:else}
					<Hand
						cards={getFaceDownCards(multiplayerGameStore.getHandCount(0))}
						faceUp={false}
					/>
				{/if}
			</div>
		</main>

		<!-- Footer info -->
		<footer class="p-2 bg-green-950 text-center">
			{#if multiplayerGameStore.trump}
				<TrumpIndicator trump={multiplayerGameStore.trump} playingTeam={multiplayerGameStore.playingTeam} />
			{/if}
			<div class="text-green-400 text-xs mt-1">
				Slag {multiplayerGameStore.completedTricks.length + 1}/8 •
				Ronde {multiplayerGameStore.round}/16
				{#if multiplayerGameStore.isMyTurn}
					• <span class="text-amber-400">Jouw beurt!</span>
				{/if}
			</div>
		</footer>
	{/if}
</div>
