<script lang="ts">
	import { lobbyStore } from '$lib/stores/lobbyStore.svelte';
	import {
		chooseTrump,
		playCard,
		completeTrick,
		startNextRound
	} from '$lib/multiplayer/gameService';
	import type { Card } from '$lib/game/deck';
	import type { PlayerSeat } from '$lib/multiplayer/types';
	import GameTable from './GameTable.svelte';
	import TrumpSelector from './TrumpSelector.svelte';

	let gameState = $derived(lobbyStore.lobby?.game);
	let mySeat = $derived(lobbyStore.currentPlayer?.seat as PlayerSeat | undefined);
	let lobbyCode = $derived(lobbyStore.lobby?.code);
	let players = $derived(lobbyStore.lobby?.players ?? {});

	// Check if table device is joined
	let tableDeviceJoined = $derived(Object.values(players).some((p) => p.seat === 'table'));

	// Trump selection helpers
	let isTrumpPhase = $derived(gameState?.phase === 'trump');
	let isMyTrumpTurn = $derived(isTrumpPhase && gameState?.trumpChooser === mySeat);
	let trumpChooserName = $derived.by(() => {
		if (!gameState || !isTrumpPhase) return '';
		const chooserSeat = gameState.trumpChooser;
		const player = Object.values(players).find((p) => p.seat === chooserSeat);
		return player?.name ?? '?';
	});

	// Track trick length to detect when all 4 cards are played
	let trickLength = $derived((gameState?.currentTrick ?? []).length);
	let trickCompleteTimer: ReturnType<typeof setTimeout> | null = null;
	let trickCompleteFired = false;

	$effect(() => {
		if (trickLength === 4 && !trickCompleteFired) {
			// All 4 cards played — wait 1.5s then complete
			trickCompleteFired = true;
			trickCompleteTimer = setTimeout(async () => {
				if (lobbyCode) {
					await completeTrick(lobbyCode);
				}
			}, 1500);
		} else if (trickLength !== 4) {
			// Trick cleared — reset for next trick
			trickCompleteFired = false;
			if (trickCompleteTimer) {
				clearTimeout(trickCompleteTimer);
				trickCompleteTimer = null;
			}
		}
	});

	// Track phase to detect round end
	let currentPhase = $derived(gameState?.phase);
	let roundEndTimer: ReturnType<typeof setTimeout> | null = null;
	let roundEndFired = false;

	$effect(() => {
		if (currentPhase === 'roundEnd' && !roundEndFired) {
			roundEndFired = true;
			roundEndTimer = setTimeout(async () => {
				if (lobbyCode) {
					await startNextRound(lobbyCode);
				}
			}, 3000);
		} else if (currentPhase !== 'roundEnd') {
			roundEndFired = false;
			if (roundEndTimer) {
				clearTimeout(roundEndTimer);
				roundEndTimer = null;
			}
		}
	});

	async function handleChooseTrump(suit: Card['suit']) {
		if (!lobbyCode || mySeat === undefined) return;
		await chooseTrump(lobbyCode, mySeat, suit);
	}

	async function handleCardPlay(card: Card) {
		if (!lobbyCode || mySeat === undefined) return;
		await playCard(lobbyCode, mySeat, card);
	}
</script>

{#if gameState && mySeat !== undefined}
	<!-- Trump selection overlay -->
	{#if isTrumpPhase}
		<GameTable
			{gameState}
			{mySeat}
			myPlayerId={lobbyStore.playerId ?? ''}
			{players}
			{tableDeviceJoined}
			onCardPlay={handleCardPlay}
		/>
		<TrumpSelector
			isMyTurn={isMyTrumpTurn}
			chooserName={trumpChooserName}
			onChoose={handleChooseTrump}
		/>
	{:else if gameState.phase === 'roundEnd'}
		<!-- Round end display -->
		<div class="flex h-screen items-center justify-center bg-green-900">
			<div class="rounded-xl bg-green-800 p-8 text-center shadow-2xl">
				<h2 class="mb-4 text-xl font-bold text-white">Ronde {gameState.round} afgelopen</h2>
				<div class="mb-4 flex gap-8">
					<div class="text-center">
						<p class="text-sm text-green-400">Noord-Zuid</p>
						<p class="text-2xl font-bold text-white">
							{gameState.scores.ns.base + gameState.scores.ns.roem}
						</p>
						{#if gameState.scores.ns.roem > 0}
							<p class="text-xs text-amber-400">({gameState.scores.ns.roem} roem)</p>
						{/if}
					</div>
					<div class="text-center">
						<p class="text-sm text-green-400">West-Oost</p>
						<p class="text-2xl font-bold text-white">
							{gameState.scores.we.base + gameState.scores.we.roem}
						</p>
						{#if gameState.scores.we.roem > 0}
							<p class="text-xs text-amber-400">({gameState.scores.we.roem} roem)</p>
						{/if}
					</div>
				</div>
				<div class="mb-2 flex gap-8 border-t border-green-700 pt-2">
					<div class="text-center">
						<p class="text-xs text-green-400">Totaal</p>
						<p class="text-lg font-bold text-white">{gameState.gameScores.ns}</p>
					</div>
					<div class="text-center">
						<p class="text-xs text-green-400">Totaal</p>
						<p class="text-lg font-bold text-white">{gameState.gameScores.we}</p>
					</div>
				</div>
				<p class="mt-4 text-sm text-green-400">Volgende ronde begint zo...</p>
			</div>
		</div>
	{:else if gameState.phase === 'gameEnd'}
		<!-- Game end display -->
		<div class="flex h-screen items-center justify-center bg-green-900">
			<div class="rounded-xl bg-green-800 p-8 text-center shadow-2xl">
				<h2 class="mb-4 text-2xl font-bold text-yellow-400">Spel afgelopen!</h2>
				<div class="mb-4 flex gap-8">
					<div class="text-center">
						<p class="text-sm text-green-400">Noord-Zuid</p>
						<p class="text-3xl font-bold text-white">{gameState.gameScores.ns}</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-green-400">West-Oost</p>
						<p class="text-3xl font-bold text-white">{gameState.gameScores.we}</p>
					</div>
				</div>
				{#if gameState.gameScores.ns > gameState.gameScores.we}
					<p class="text-lg font-bold text-yellow-400">Noord-Zuid wint!</p>
				{:else if gameState.gameScores.we > gameState.gameScores.ns}
					<p class="text-lg font-bold text-yellow-400">West-Oost wint!</p>
				{:else}
					<p class="text-lg font-bold text-yellow-400">Gelijkspel!</p>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Playing phase -->
		<GameTable
			{gameState}
			{mySeat}
			myPlayerId={lobbyStore.playerId ?? ''}
			{players}
			{tableDeviceJoined}
			onCardPlay={handleCardPlay}
		/>
	{/if}
{:else}
	<div class="flex h-screen items-center justify-center bg-green-900">
		<p class="text-white">Laden...</p>
	</div>
{/if}
