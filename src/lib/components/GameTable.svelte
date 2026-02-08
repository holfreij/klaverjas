<script lang="ts">
	import type { GameState, PlayerSeat, Player } from '$lib/multiplayer/types';
	import type { Card as CardType } from '$lib/game/deck';
	import { getRelativePositions } from '$lib/game/positions';
	import Hand from './Hand.svelte';
	import Card from './Card.svelte';

	interface Props {
		gameState: GameState;
		mySeat: PlayerSeat;
		myPlayerId: string;
		players: Record<string, Player>;
		tableDeviceJoined: boolean;
		onCardPlay: (card: CardType) => void;
		onRoem?: () => void;
		onVerzaakt?: () => void;
	}

	let {
		gameState,
		mySeat,
		myPlayerId: _myPlayerId,
		players,
		tableDeviceJoined,
		onCardPlay,
		onRoem,
		onVerzaakt
	}: Props = $props();

	// Get relative positions for layout
	let positions = $derived(getRelativePositions(mySeat));

	// Helper to get player name by seat
	function getPlayerBySeat(seat: PlayerSeat): Player | null {
		return Object.values(players).find((p) => p.seat === seat) ?? null;
	}

	// Get player info for each position
	let partnerPlayer = $derived(getPlayerBySeat(positions.partner));
	let leftPlayer = $derived(getPlayerBySeat(positions.left));
	let rightPlayer = $derived(getPlayerBySeat(positions.right));

	// My hand
	let myHand = $derived((gameState.hands ?? {})[mySeat] ?? []);

	// Safe currentTrick (Firebase drops empty arrays)
	let currentTrick = $derived(gameState.currentTrick ?? []);

	// Get team player names for score display
	function getTeamNames(team: 'ns' | 'we'): string {
		const seats = team === 'ns' ? [0, 2] : [1, 3];
		const names = seats
			.map((seat) => getPlayerBySeat(seat as PlayerSeat)?.name ?? '?')
			.map((name) => (name.length > 20 ? name.slice(0, 20) + '…' : name));
		return names.join(' & ');
	}

	let nsTeamNames = $derived(getTeamNames('ns'));
	let weTeamNames = $derived(getTeamNames('we'));

	// Is it someone's turn?
	function isActivePlayer(seat: PlayerSeat): boolean {
		return gameState.currentPlayer === seat;
	}

	let isMyTurn = $derived(isActivePlayer(mySeat));

	// Button enable states
	// Roem and Verzaakt are only enabled after at least one card is played
	let hasCardsInTrick = $derived(currentTrick.length > 0);
	let canClaimRoem = $derived(hasCardsInTrick && !gameState.roemClaimed);
	let canCallVerzaakt = $derived(currentTrick.length >= 2);
</script>

<div
	data-testid="game-table"
	class="landscape-only relative flex h-screen max-h-screen flex-col overflow-hidden bg-green-900"
>
	<!-- Score header -->
	<header
		data-testid="score-header"
		class="flex items-center justify-between bg-green-950 px-4 py-2 text-white"
	>
		<div class="flex items-center gap-4">
			<span class="text-sm text-green-400">Ronde {gameState.round} van 16</span>
		</div>
		<div class="flex items-center gap-6">
			<div class="text-center">
				<span class="text-xs text-green-400">{nsTeamNames}</span>
				<span class="ml-2 font-bold">{gameState.gameScores.ns}</span>
			</div>
			<div class="text-center">
				<span class="text-xs text-green-400">{weTeamNames}</span>
				<span class="ml-2 font-bold">{gameState.gameScores.we}</span>
			</div>
		</div>
		<!-- Trump indicator -->
		{#if gameState.trump}
			<div
				data-testid="trump-indicator"
				class="flex items-center gap-2 rounded bg-green-800 px-3 py-1"
			>
				<span class="text-xs text-green-400">Troef:</span>
				<span
					class="text-2xl {gameState.trump === '♥' || gameState.trump === '♦'
						? 'text-red-500'
						: 'text-white'}"
				>
					{gameState.trump}
				</span>
			</div>
		{/if}
	</header>

	<!-- Main game area -->
	<div class="relative flex flex-1">
		<!-- Left player -->
		<div
			data-testid="player-left"
			class="flex w-24 flex-col items-center justify-center border-r border-green-800 p-2
				{isActivePlayer(positions.left) ? 'ring-2 ring-amber-400 ring-inset' : ''}"
		>
			<span class="text-sm font-medium text-white">{leftPlayer?.name ?? '?'}</span>
		</div>

		<!-- Center area (trick + partner) -->
		<div class="flex flex-1 flex-col">
			<!-- Partner at top -->
			<div
				data-testid="player-top"
				class="flex items-center justify-center border-b border-green-800 p-3
					{isActivePlayer(positions.partner) ? 'ring-2 ring-amber-400 ring-inset' : ''}"
			>
				<span class="text-sm font-medium text-white">{partnerPlayer?.name ?? '?'}</span>
			</div>

			<!-- Trick area (center) -->
			{#if !tableDeviceJoined}
				<div
					data-testid="trick-area"
					class="trick-area relative flex flex-1 items-center justify-center"
				>
					<!-- Grid layout for trick cards: 3 rows, 3 cols -->
					<div class="trick-grid grid grid-cols-3 grid-rows-3 gap-0">
						<!-- Top (partner) - row 1, col 2 -->
						<div class="col-start-2 row-start-1 flex items-start justify-center">
							{#each currentTrick.filter((c) => c.seat === positions.partner) as playedCard (playedCard.card.suit + playedCard.card.rank)}
								<Card card={playedCard.card} />
							{/each}
						</div>
						<!-- Left - row 2, col 1 -->
						<div class="col-start-1 row-start-2 flex items-center justify-end">
							{#each currentTrick.filter((c) => c.seat === positions.left) as playedCard (playedCard.card.suit + playedCard.card.rank)}
								<Card card={playedCard.card} />
							{/each}
						</div>
						<!-- Center spacer - row 2, col 2 -->
						<div class="col-start-2 row-start-2"></div>
						<!-- Right - row 2, col 3 -->
						<div class="col-start-3 row-start-2 flex items-center justify-start">
							{#each currentTrick.filter((c) => c.seat === positions.right) as playedCard (playedCard.card.suit + playedCard.card.rank)}
								<Card card={playedCard.card} />
							{/each}
						</div>
						<!-- Bottom (self) - row 3, col 2 -->
						<div class="col-start-2 row-start-3 flex items-end justify-center">
							{#each currentTrick.filter((c) => c.seat === positions.self) as playedCard (playedCard.card.suit + playedCard.card.rank)}
								<Card card={playedCard.card} />
							{/each}
						</div>
					</div>
				</div>
			{:else}
				<div class="flex flex-1 items-center justify-center text-green-600">
					<!-- Empty when table device handles trick display -->
				</div>
			{/if}
		</div>

		<!-- Right player -->
		<div
			data-testid="player-right"
			class="flex w-24 flex-col items-center justify-center border-l border-green-800 p-2
				{isActivePlayer(positions.right) ? 'ring-2 ring-amber-400 ring-inset' : ''}"
		>
			<span class="text-sm font-medium text-white">{rightPlayer?.name ?? '?'}</span>
		</div>
	</div>

	<!-- Player's hand at bottom -->
	<div
		class="border-t border-green-800 bg-green-800/50 px-2 py-1
			{isMyTurn ? 'ring-2 ring-amber-400 ring-inset' : ''}"
	>
		<div class="flex items-center gap-2">
			<!-- Action buttons -->
			<div class="flex flex-col gap-1">
				<button
					data-testid="roem-button"
					onclick={() => onRoem?.()}
					disabled={!canClaimRoem}
					class="rounded bg-amber-600 px-3 py-1 text-sm font-bold text-white transition-colors
						hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-green-700 disabled:text-green-500"
				>
					Roem
				</button>
				<button
					data-testid="verzaakt-button"
					onclick={() => onVerzaakt?.()}
					disabled={!canCallVerzaakt}
					class="rounded bg-red-600 px-3 py-1 text-sm font-bold text-white transition-colors
						hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-green-700 disabled:text-green-500"
				>
					Verzaakt
				</button>
			</div>

			<!-- Hand -->
			<div class="flex-1">
				<Hand cards={myHand} trump={gameState.trump ?? '♠'} {onCardPlay} disabled={!isMyTurn} />
			</div>
		</div>
	</div>
</div>

<style>
	.trick-area {
		--card-height: max(14vh, 70px);
		--card-rank-size: max(2.2vh, 14px);
		--card-suit-size: max(3vh, 18px);
	}

	.trick-grid {
		width: max(26vh, 140px);
		height: max(32vh, 160px);
	}
</style>
