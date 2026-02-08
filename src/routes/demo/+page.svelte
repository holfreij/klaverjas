<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Hand from '$lib/components/Hand.svelte';
	import GameTable from '$lib/components/GameTable.svelte';
	import type { Card as CardType, Suit } from '$lib/game/deck';
	import type { GameState, Player } from '$lib/multiplayer/types';
	import { shuffleDeck, createDeck, dealHands } from '$lib/game/deck';

	let showGameTable = $state(false);

	// Demo state
	let trump: Suit = $state('♥');
	let lastPlayed: CardType | null = $state(null);

	// Deal a sample hand
	const deck = shuffleDeck(createDeck());
	const [hand1] = dealHands(deck);
	let currentHand = $state(hand1);

	function handleCardPlay(card: CardType) {
		lastPlayed = card;
		currentHand = currentHand.filter((c) => !(c.suit === card.suit && c.rank === card.rank));
	}

	function resetHand() {
		const newDeck = shuffleDeck(createDeck());
		const [newHand] = dealHands(newDeck);
		currentHand = newHand;
		lastPlayed = null;
	}

	// Demo game state for GameTable
	const demoPlayers: Record<string, Player> = {
		player0: { name: 'Jij', seat: 0, connected: true, lastSeen: Date.now() },
		player1: { name: 'Piet', seat: 1, connected: true, lastSeen: Date.now() },
		player2: { name: 'Klaas', seat: 2, connected: true, lastSeen: Date.now() },
		player3: { name: 'Marie', seat: 3, connected: true, lastSeen: Date.now() }
	};

	const allHands = dealHands(shuffleDeck(createDeck()));

	// Demo scenarios cycling through different roem tricks
	const demoScenarios: { name: string; state: GameState }[] = [
		{
			name: '3-reeks (Q-K-A ♠) — 20 roem',
			state: {
				phase: 'trickEnd',
				round: 3,
				trick: 2,
				dealer: 0,
				trump: '♥',
				trumpChooser: 0,
				playingTeam: 'ns',
				currentPlayer: 0,
				handsAtTrickStart: { 0: allHands[0], 1: allHands[1], 2: allHands[2], 3: allHands[3] },
				hands: { 0: allHands[0], 1: allHands[1], 2: allHands[2], 3: allHands[3] },
				currentTrick: [
					{ card: { suit: '♠', rank: 'Q' }, seat: 1 },
					{ card: { suit: '♠', rank: 'K' }, seat: 2 },
					{ card: { suit: '♠', rank: 'A' }, seat: 0 },
					{ card: { suit: '♣', rank: '7' }, seat: 3 }
				],
				completedTricks: [],
				scores: { ns: { base: 42, roem: 0 }, we: { base: 38, roem: 0 } },
				gameScores: { ns: 245, we: 198 },
				roemClaimed: false,
				roemClaimPending: null,
				roemPointsPending: 0,
				lastNotification: null,
				skipVotes: []
			}
		},
		{
			name: '4-reeks (J-Q-K-A ♦) — 50 roem',
			state: {
				phase: 'trickEnd',
				round: 5,
				trick: 4,
				dealer: 2,
				trump: '♠',
				trumpChooser: 3,
				playingTeam: 'we',
				currentPlayer: 2,
				handsAtTrickStart: { 0: allHands[0], 1: allHands[1], 2: allHands[2], 3: allHands[3] },
				hands: { 0: allHands[0], 1: allHands[1], 2: allHands[2], 3: allHands[3] },
				currentTrick: [
					{ card: { suit: '♦', rank: 'J' }, seat: 3 },
					{ card: { suit: '♦', rank: 'Q' }, seat: 0 },
					{ card: { suit: '♦', rank: 'K' }, seat: 1 },
					{ card: { suit: '♦', rank: 'A' }, seat: 2 }
				],
				completedTricks: [],
				scores: { ns: { base: 20, roem: 0 }, we: { base: 55, roem: 20 } },
				gameScores: { ns: 310, we: 280 },
				roemClaimed: false,
				roemClaimPending: null,
				roemPointsPending: 0,
				lastNotification: null,
				skipVotes: []
			}
		},
		{
			name: 'Stuk (K+Q ♥ troef) — 20 roem',
			state: {
				phase: 'trickEnd',
				round: 1,
				trick: 3,
				dealer: 0,
				trump: '♥',
				trumpChooser: 1,
				playingTeam: 'we',
				currentPlayer: 1,
				handsAtTrickStart: { 0: allHands[0], 1: allHands[1], 2: allHands[2], 3: allHands[3] },
				hands: { 0: allHands[0], 1: allHands[1], 2: allHands[2], 3: allHands[3] },
				currentTrick: [
					{ card: { suit: '♥', rank: 'K' }, seat: 1 },
					{ card: { suit: '♥', rank: 'Q' }, seat: 2 },
					{ card: { suit: '♣', rank: '9' }, seat: 3 },
					{ card: { suit: '♣', rank: '8' }, seat: 0 }
				],
				completedTricks: [],
				scores: { ns: { base: 10, roem: 0 }, we: { base: 30, roem: 0 } },
				gameScores: { ns: 120, we: 155 },
				roemClaimed: false,
				roemClaimPending: null,
				roemPointsPending: 0,
				lastNotification: null,
				skipVotes: []
			}
		},
		{
			name: 'Vier gelijke (4x Boer) — 100 roem',
			state: {
				phase: 'trickEnd',
				round: 8,
				trick: 6,
				dealer: 1,
				trump: '♣',
				trumpChooser: 2,
				playingTeam: 'ns',
				currentPlayer: 3,
				handsAtTrickStart: { 0: allHands[0], 1: allHands[1], 2: allHands[2], 3: allHands[3] },
				hands: { 0: allHands[0], 1: allHands[1], 2: allHands[2], 3: allHands[3] },
				currentTrick: [
					{ card: { suit: '♠', rank: 'J' }, seat: 0 },
					{ card: { suit: '♥', rank: 'J' }, seat: 1 },
					{ card: { suit: '♣', rank: 'J' }, seat: 2 },
					{ card: { suit: '♦', rank: 'J' }, seat: 3 }
				],
				completedTricks: [],
				scores: { ns: { base: 80, roem: 20 }, we: { base: 60, roem: 0 } },
				gameScores: { ns: 520, we: 490 },
				roemClaimed: false,
				roemClaimPending: null,
				roemPointsPending: 0,
				lastNotification: null,
				skipVotes: []
			}
		}
	];

	let currentScenario = $state(0);
	let demoGameState = $derived(demoScenarios[currentScenario].state);
</script>

<div class="min-h-screen bg-green-900 p-8">
	<h1 class="mb-8 text-center text-3xl font-bold text-white">Kaart Demo</h1>

	<!-- Trump selector -->
	<div class="mb-8 text-center">
		<span class="mr-4 text-white">Troef:</span>
		{#each ['♠', '♥', '♣', '♦'] as suit (suit)}
			<button
				onclick={() => (trump = suit as Suit)}
				class="mx-1 rounded px-4 py-2 text-2xl {trump === suit
					? 'bg-yellow-500 text-green-900'
					: 'bg-green-700 text-white'}"
			>
				{suit}
			</button>
		{/each}
	</div>

	<!-- Individual card examples -->
	<div class="mb-8">
		<h2 class="mb-4 text-xl text-white">Losse kaarten</h2>
		<div class="flex flex-wrap gap-4">
			<div>
				<p class="mb-2 text-sm text-green-300">Normaal</p>
				<Card card={{ suit: '♠', rank: 'A' }} />
			</div>
			<div>
				<p class="mb-2 text-sm text-green-300">Rood</p>
				<Card card={{ suit: '♥', rank: 'Q' }} />
			</div>
			<div>
				<p class="mb-2 text-sm text-green-300">Geselecteerd</p>
				<Card card={{ suit: '♣', rank: 'J' }} selected={true} />
			</div>
			<div>
				<p class="mb-2 text-sm text-green-300">Uitgeschakeld</p>
				<Card card={{ suit: '♦', rank: '10' }} disabled={true} />
			</div>
			<div>
				<p class="mb-2 text-sm text-green-300">Omgedraaid</p>
				<Card card={{ suit: '♠', rank: '7' }} faceUp={false} />
			</div>
		</div>
	</div>

	<!-- Hand example -->
	<div class="mb-8 rounded-lg bg-green-800 p-4">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl text-white">Jouw hand (klik om te spelen)</h2>
			<button
				onclick={resetHand}
				class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-500"
			>
				Nieuwe hand
			</button>
		</div>

		<Hand cards={currentHand} {trump} onCardPlay={handleCardPlay} />

		{#if lastPlayed}
			<div class="mt-4 text-center text-green-300">
				Laatst gespeeld: {lastPlayed.rank}
				{lastPlayed.suit}
			</div>
		{/if}
	</div>

	<!-- All 32 cards -->
	<div class="mb-8">
		<h2 class="mb-4 text-xl text-white">Alle 32 kaarten</h2>
		<div class="grid gap-2">
			{#each ['♠', '♥', '♣', '♦'] as suit (suit)}
				<div class="flex gap-1">
					{#each ['A', '10', 'K', 'Q', 'J', '9', '8', '7'] as rank (rank)}
						<Card card={{ suit: suit as Suit, rank: rank as CardType['rank'] }} />
					{/each}
				</div>
			{/each}
		</div>
	</div>

	<!-- GameTable toggle -->
	<div class="mb-8">
		<div class="mb-2 flex items-center gap-4">
			<button
				onclick={() => (showGameTable = !showGameTable)}
				class="rounded bg-yellow-500 px-6 py-3 font-bold text-green-900 hover:bg-yellow-400"
			>
				{showGameTable ? 'Verberg Speltafel' : 'Toon Speltafel Demo'}
			</button>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#each demoScenarios as scenario, i (i)}
				<button
					data-scenario={i}
					onclick={() => (currentScenario = i)}
					class="rounded px-3 py-2 text-sm {currentScenario === i
						? 'bg-amber-500 font-bold text-green-900'
						: 'bg-green-700 text-white hover:bg-green-600'}"
				>
					{scenario.name}
				</button>
			{/each}
		</div>
	</div>
</div>

<!-- Full-screen GameTable demo -->
{#if showGameTable}
	<div class="fixed inset-0 z-50">
		<button
			onclick={() => (showGameTable = false)}
			class="absolute top-1 left-1/2 z-10 -translate-x-1/2 rounded bg-red-600/80 px-2 py-0.5 text-xs text-white hover:bg-red-500"
		>
			&times;
		</button>
		<GameTable
			gameState={demoGameState}
			mySeat={0}
			myPlayerId="player0"
			players={demoPlayers}
			tableDeviceJoined={false}
			onCardPlay={(card) => console.log('Played:', card)}
		/>
	</div>
{/if}
