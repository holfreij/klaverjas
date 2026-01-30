<script lang="ts">
	import type { Lobby, LobbyPlayer, Seat } from '$lib/multiplayer';

	interface Props {
		lobby: Lobby;
		currentPlayerId: string;
		onChangeSeat?: (seat: Seat) => void;
	}

	let { lobby, currentPlayerId, onChangeSeat }: Props = $props();

	const SEAT_NAMES: Record<number, string> = {
		0: 'Zuid',
		1: 'West',
		2: 'Noord',
		3: 'Oost',
	};

	const SEAT_TEAMS: Record<number, string> = {
		0: 'Wij',
		1: 'Zij',
		2: 'Wij',
		3: 'Zij',
	};

	// Get players organized by seat
	let playersBySeat = $derived.by(() => {
		const result: Record<number, { id: string; player: LobbyPlayer } | null> = {
			0: null,
			1: null,
			2: null,
			3: null,
		};

		for (const [id, player] of Object.entries(lobby.players)) {
			if (typeof player.seat === 'number') {
				result[player.seat] = { id, player };
			}
		}

		return result;
	});

	let spectators = $derived(
		Object.entries(lobby.players)
			.filter(([, p]) => p.seat === 'spectator' || p.seat === 'table')
			.map(([id, player]) => ({ id, player }))
	);

	function handleSeatClick(seat: Seat) {
		if (onChangeSeat && !playersBySeat[seat as number]) {
			onChangeSeat(seat);
		}
	}
</script>

<div class="space-y-4">
	<h3 class="text-lg font-semibold text-white">Spelers</h3>

	<div class="grid grid-cols-2 gap-3">
		{#each [0, 2, 1, 3] as seat}
			{@const occupant = playersBySeat[seat]}
			{@const isMe = occupant?.id === currentPlayerId}
			{@const isHost = occupant?.id === lobby.host}

			<button
				class="p-3 rounded-lg border-2 transition-colors {occupant
					? 'bg-green-800 border-green-600'
					: 'bg-green-900/50 border-green-700 border-dashed hover:border-green-500 cursor-pointer'}"
				disabled={!!occupant}
				onclick={() => handleSeatClick(seat as Seat)}
			>
				<div class="flex items-center justify-between mb-1">
					<span class="text-sm text-green-400">{SEAT_NAMES[seat]}</span>
					<span class="text-xs px-1.5 py-0.5 rounded {SEAT_TEAMS[seat] === 'Wij' ? 'bg-blue-600' : 'bg-red-600'}">
						{SEAT_TEAMS[seat]}
					</span>
				</div>

				{#if occupant}
					<div class="flex items-center gap-2">
						<span class="text-white font-medium truncate">
							{occupant.player.name}
							{#if isMe}
								<span class="text-green-400">(jij)</span>
							{/if}
						</span>
						{#if isHost}
							<span class="text-xs bg-amber-600 px-1.5 py-0.5 rounded">Host</span>
						{/if}
					</div>
					<div class="flex items-center gap-1 mt-1">
						<span
							class="w-2 h-2 rounded-full {occupant.player.connected
								? 'bg-green-400'
								: 'bg-gray-500'}"
						></span>
						<span class="text-xs text-gray-400">
							{occupant.player.connected ? 'Online' : 'Offline'}
						</span>
					</div>
				{:else}
					<div class="text-gray-500 italic">Leeg - klik om mee te doen</div>
				{/if}
			</button>
		{/each}
	</div>

	{#if spectators.length > 0}
		<div class="mt-4 pt-4 border-t border-green-700">
			<h4 class="text-sm font-medium text-gray-400 mb-2">Toeschouwers</h4>
			<div class="flex flex-wrap gap-2">
				{#each spectators as { id, player }}
					<span class="text-sm bg-green-800 px-2 py-1 rounded text-white">
						{player.name}
						{#if id === currentPlayerId}
							<span class="text-green-400">(jij)</span>
						{/if}
					</span>
				{/each}
			</div>
		</div>
	{/if}
</div>
