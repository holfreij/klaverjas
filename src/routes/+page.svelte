<script lang="ts">
	import { base } from '$app/paths';
</script>

<div class="min-h-screen bg-green-900 flex flex-col items-center justify-center text-white">
	<h1 class="text-4xl font-bold mb-4">Klaverjas</h1>
	<p class="text-lg text-green-200 mb-8">Online multiplayer card game</p>

	<a
		href="{base}/play"
		class="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xl rounded-lg transition-colors"
	>
		Play Now
	</a>

	<p class="mt-8 text-sm text-green-400">Rotterdam rules • Single device prototype</p>
</div>
