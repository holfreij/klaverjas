<script lang="ts">
	import type { ConnectionStatus } from '$lib/multiplayer';

	interface Props {
		status: ConnectionStatus;
	}

	let { status }: Props = $props();

	const statusConfig = {
		connecting: { text: 'Verbinden...', color: 'bg-yellow-500' },
		connected: { text: 'Verbonden', color: 'bg-green-500' },
		disconnected: { text: 'Verbinding verbroken', color: 'bg-red-500' },
	};

	let config = $derived(statusConfig[status]);
</script>

<div class="flex items-center gap-2 text-sm">
	<span class="relative flex h-2 w-2">
		{#if status === 'connecting'}
			<span
				class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"
			></span>
		{/if}
		<span class="relative inline-flex rounded-full h-2 w-2 {config.color}"></span>
	</span>
	<span class="text-gray-300">{config.text}</span>
</div>
