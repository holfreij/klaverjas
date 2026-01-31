<script lang="ts">
	import { browser } from '$app/environment';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let isPortrait = $state(false);

	function checkOrientation() {
		if (browser) {
			isPortrait = window.innerHeight > window.innerWidth;
		}
	}

	$effect(() => {
		if (browser) {
			checkOrientation();
			window.addEventListener('resize', checkOrientation);
			window.addEventListener('orientationchange', checkOrientation);

			return () => {
				window.removeEventListener('resize', checkOrientation);
				window.removeEventListener('orientationchange', checkOrientation);
			};
		}
	});
</script>

{#if isPortrait}
	<div class="flex min-h-screen flex-col items-center justify-center bg-green-900 p-8 text-center">
		<div class="mb-4 text-6xl">📱</div>
		<h1 class="mb-2 text-2xl font-bold text-white">Draai je scherm</h1>
		<p class="text-green-300">Dit spel werkt alleen in landschap-modus</p>
	</div>
{:else}
	{@render children()}
{/if}
