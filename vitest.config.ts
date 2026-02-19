import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	plugins: [svelte({ hot: false })],
	envPrefix: ['VITE_', 'PUBLIC_'],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			'$env/static/public': path.resolve('./tests/mocks/env-static-public.ts')
		},
		conditions: ['browser']
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
		exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./vitest.setup.ts']
	}
});
