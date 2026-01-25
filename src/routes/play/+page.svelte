<script lang="ts">
	import { Hand, Table, TrumpIndicator, TrumpSelector, ScoreDisplay } from '$lib/components';
	import { gameStore } from '$lib/stores/gameStore.svelte';
	import type { Card } from '$lib/game/deck';

	const playerNames = ['South (You)', 'West', 'North', 'East'];

	function handleCardSelect(card: Card) {
		gameStore.play(card);
	}

	function handleNewGame() {
		gameStore.newGame();
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
</script>

<svelte:head>
	<title>Klaverjas - Play</title>
</svelte:head>

<div class="min-h-screen bg-green-900 flex flex-col">
	<!-- Header -->
	<header class="flex items-center justify-between p-3 bg-green-950">
		<h1 class="text-white font-bold text-xl">Klaverjas</h1>
		<div class="flex items-center gap-3">
			<ScoreDisplay
				scores={gameStore.state.scores}
				round={gameStore.state.round}
				playingTeam={gameStore.state.playingTeam}
			/>
			<button
				type="button"
				class="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm"
				onclick={handleNewGame}
			>
				New Game
			</button>
		</div>
	</header>

	<!-- Game finished overlay -->
	{#if gameStore.isGameOver}
		<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
			<div class="bg-green-800 rounded-lg p-8 text-center">
				<h2 class="text-3xl font-bold text-white mb-4">Game Over!</h2>
				<div class="text-xl text-green-200 mb-6">
					{#if gameStore.state.winner === 'NS'}
						North-South wins!
					{:else if gameStore.state.winner === 'WE'}
						West-East wins!
					{:else}
						It's a tie!
					{/if}
				</div>
				<div class="text-lg text-white mb-6">
					Final Score: NS {gameStore.state.scores.NS} - WE {gameStore.state.scores.WE}
				</div>
				<button
					type="button"
					class="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold"
					onclick={handleNewGame}
				>
					Play Again
				</button>
			</div>
		</div>
	{/if}

	<!-- Main game area -->
	<main class="flex-1 flex flex-col items-center justify-center p-4 gap-4">
		<!-- Trump selector (shown during trump phase) -->
		{#if gameStore.isTrumpPhase}
			<div class="absolute z-40">
				<TrumpSelector
					playerName={playerNames[gameStore.state.currentPlayer]}
					onSelect={(suit) => gameStore.selectTrump(suit)}
				/>
			</div>
		{/if}

		<!-- North hand (Player 2) -->
		<div class="flex flex-col items-center">
			<span class="text-green-300 text-sm mb-1 {gameStore.state.currentPlayer === 2 ? 'text-amber-400 font-bold' : ''}">
				{playerNames[2]}
			</span>
			<Hand
				cards={sortHand(gameStore.state.hands[2] ?? [])}
				legalCards={gameStore.getLegalMovesForPlayer(2)}
				onCardSelect={gameStore.state.currentPlayer === 2 ? handleCardSelect : undefined}
				faceUp={true}
			/>
		</div>

		<!-- Middle row: West, Table, East -->
		<div class="flex items-center justify-center gap-8">
			<!-- West hand (Player 1) -->
			<div class="flex flex-col items-center">
				<span class="text-green-300 text-sm mb-1 {gameStore.state.currentPlayer === 1 ? 'text-amber-400 font-bold' : ''}">
					{playerNames[1]}
				</span>
				<Hand
					cards={sortHand(gameStore.state.hands[1] ?? [])}
					legalCards={gameStore.getLegalMovesForPlayer(1)}
					onCardSelect={gameStore.state.currentPlayer === 1 ? handleCardSelect : undefined}
					faceUp={true}
				/>
			</div>

			<!-- Table/Trick area -->
			<Table
				currentTrick={gameStore.state.currentTrick}
				trump={gameStore.state.trump}
				currentPlayer={gameStore.state.currentPlayer}
				{playerNames}
			/>

			<!-- East hand (Player 3) -->
			<div class="flex flex-col items-center">
				<span class="text-green-300 text-sm mb-1 {gameStore.state.currentPlayer === 3 ? 'text-amber-400 font-bold' : ''}">
					{playerNames[3]}
				</span>
				<Hand
					cards={sortHand(gameStore.state.hands[3] ?? [])}
					legalCards={gameStore.getLegalMovesForPlayer(3)}
					onCardSelect={gameStore.state.currentPlayer === 3 ? handleCardSelect : undefined}
					faceUp={true}
				/>
			</div>
		</div>

		<!-- South hand (Player 0) -->
		<div class="flex flex-col items-center">
			<span class="text-green-300 text-sm mb-1 {gameStore.state.currentPlayer === 0 ? 'text-amber-400 font-bold' : ''}">
				{playerNames[0]}
			</span>
			<Hand
				cards={sortHand(gameStore.state.hands[0] ?? [])}
				legalCards={gameStore.getLegalMovesForPlayer(0)}
				onCardSelect={gameStore.state.currentPlayer === 0 ? handleCardSelect : undefined}
				faceUp={true}
			/>
		</div>
	</main>

	<!-- Footer info -->
	<footer class="p-2 bg-green-950 text-center">
		{#if gameStore.state.trump}
			<TrumpIndicator trump={gameStore.state.trump} playingTeam={gameStore.state.playingTeam} />
		{/if}
		<div class="text-green-400 text-xs mt-1">
			Trick {gameStore.state.completedTricks.length + 1}/8 •
			God Mode (all hands visible)
		</div>
	</footer>
</div>
