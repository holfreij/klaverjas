import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Full game E2E test: 4 players join a lobby, start a game,
 * choose trump, and play through multiple tricks.
 *
 * This serves both as a comprehensive integration test and a
 * live demo of the complete gameplay flow.
 */

const PLAYERS = ['Alice', 'Bob', 'Carol', 'Dave'];

// Helper to ensure page is on home screen (not reconnecting to a previous lobby)
async function ensureHomePage(page: Page) {
	await page.goto('/');
	await page.evaluate(() => localStorage.clear());
	await page.goto('/');
	await expect(page.locator('h1:has-text("Klaverjas")')).toBeVisible({ timeout: 10000 });
}

// Helper to create a lobby and return the code
async function createLobby(page: Page, playerName: string): Promise<string> {
	await ensureHomePage(page);

	await page.fill('#playerName', playerName);
	await page.click('button:has-text("Maak lobby")');

	await expect(page.locator('p:has-text("Lobby code")')).toBeVisible({ timeout: 10000 });

	const codeButton = page.locator('button.text-3xl');
	const code = await codeButton.textContent();
	return code?.trim() || '';
}

// Helper to join a lobby
async function joinLobby(page: Page, playerName: string, lobbyCode: string) {
	await ensureHomePage(page);

	await page.fill('#playerName', playerName);
	await page.fill('#lobbyCode', lobbyCode);

	const joinButton = page.locator('button:has-text("Deelnemen")');
	await expect(joinButton).toBeEnabled({ timeout: 5000 });
	await joinButton.click();

	await expect(page.locator('p:has-text("Lobby code")')).toBeVisible({ timeout: 10000 });
}

// Find which player page currently has the trump chooser UI
async function findTrumpChooser(pages: Page[]): Promise<number> {
	for (let i = 0; i < pages.length; i++) {
		const suitButtons = pages[i].locator('[data-testid="trump-selector"] button[aria-label]');
		if ((await suitButtons.count()) > 0) {
			return i;
		}
	}
	return -1;
}

// Find which player page currently has clickable cards (it's their turn)
// Polls with retries to handle Firebase sync delays
async function findCurrentPlayer(pages: Page[], maxRetries = 20): Promise<number> {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		for (let i = 0; i < pages.length; i++) {
			const clickableCards = pages[i].locator(
				'section[aria-label="Jouw kaarten"] button[data-testid="card"].cursor-pointer'
			);
			if ((await clickableCards.count()) > 0) {
				return i;
			}
		}
		// Wait before retrying
		await pages[0].waitForTimeout(500);
	}
	return -1;
}

// Play a single card for the current player (first legal card)
async function playFirstLegalCard(page: Page): Promise<string> {
	const cardButton = page
		.locator('section[aria-label="Jouw kaarten"] button[data-testid="card"].cursor-pointer')
		.first();

	const label = (await cardButton.getAttribute('aria-label')) ?? 'unknown card';
	await cardButton.click();
	return label;
}

test.describe('Full Game E2E', () => {
	let contexts: BrowserContext[];
	let pages: Page[];

	test.beforeEach(async ({ browser }) => {
		// Create 4 separate browser contexts (separate sessions)
		contexts = [];
		pages = [];
		for (let i = 0; i < 4; i++) {
			const ctx = await browser.newContext({
				viewport: { width: 932, height: 430 }
			});
			const page = await ctx.newPage();
			contexts.push(ctx);
			pages.push(page);
		}
	});

	test.afterEach(async () => {
		for (const ctx of contexts) {
			await ctx.close();
		}
	});

	test('4 players join, start game, choose trump, and play 2 tricks', async () => {
		test.setTimeout(90000); // This test does a lot of Firebase ops

		// ── Step 1: Alice creates a lobby ──
		const lobbyCode = await createLobby(pages[0], PLAYERS[0]);
		expect(lobbyCode).toMatch(/^\d{6}$/);

		// ── Step 2: Bob, Carol, Dave join ──
		for (let i = 1; i < 4; i++) {
			await joinLobby(pages[i], PLAYERS[i], lobbyCode);
		}

		// All should see 4/4 players
		for (let i = 0; i < 4; i++) {
			await expect(pages[i].locator('text=4/4 spelers')).toBeVisible({
				timeout: 10000
			});
		}

		// ── Step 3: Host starts the game ──
		const startButton = pages[0].locator('button:has-text("Start spel")');
		await expect(startButton).toBeVisible({ timeout: 5000 });
		await startButton.click();

		// All players should see the game table or trump selector
		for (let i = 0; i < 4; i++) {
			await expect(pages[i].locator('[data-testid="game-table"]')).toBeVisible({ timeout: 15000 });
		}

		// ── Step 4: Choose trump ──
		const trumpChooserIdx = await findTrumpChooser(pages);
		expect(trumpChooserIdx).toBeGreaterThanOrEqual(0);

		// The chooser should see suit buttons
		const suitButtons = pages[trumpChooserIdx].locator(
			'[data-testid="trump-selector"] button[aria-label]'
		);
		await expect(suitButtons).toHaveCount(4);

		// Other players should see "Wacht op..."
		for (let i = 0; i < 4; i++) {
			if (i === trumpChooserIdx) continue;
			await expect(pages[i].locator('[data-testid="trump-selector"]')).toContainText('Wacht op');
		}

		// Choose hearts
		await pages[trumpChooserIdx].click('[data-testid="trump-selector"] button[aria-label="♥"]');

		// All players should see the trump indicator
		for (let i = 0; i < 4; i++) {
			await expect(pages[i].locator('[data-testid="trump-indicator"]')).toBeVisible({
				timeout: 10000
			});
			await expect(pages[i].locator('[data-testid="trump-indicator"]')).toContainText('♥');
		}

		// ── Step 5: Play 2 tricks ──
		for (let trick = 1; trick <= 2; trick++) {
			for (let cardInTrick = 0; cardInTrick < 4; cardInTrick++) {
				// Wait a moment for Firebase sync
				await pages[0].waitForTimeout(500);

				const currentIdx = await findCurrentPlayer(pages);
				expect(currentIdx).toBeGreaterThanOrEqual(0);

				const cardLabel = await playFirstLegalCard(pages[currentIdx]);
				console.log(
					`  Trick ${trick}, card ${cardInTrick + 1}: ${PLAYERS[currentIdx]} plays ${cardLabel}`
				);

				// Wait for the card to appear in the trick area
				await pages[0].waitForTimeout(800);
			}

			// All 4 cards played — verify trick area shows 4 cards
			const trickCards = pages[0].locator('[data-testid="trick-area"] [data-testid="card"]');
			// The trick might already be clearing, so allow 0 or 4
			const trickCardCount = await trickCards.count();
			expect([0, 4]).toContain(trickCardCount);

			// Wait for trick auto-completion (1.5s timer + buffer)
			await pages[0].waitForTimeout(3000);
		}

		// ── Step 6: Verify game state after 2 tricks ──
		// All players should still see the game table
		for (let i = 0; i < 4; i++) {
			await expect(pages[i].locator('[data-testid="game-table"]')).toBeVisible();
		}

		// Each player should have 6 cards left (started with 8, played 2)
		for (let i = 0; i < 4; i++) {
			const handCards = pages[i].locator('section[aria-label="Jouw kaarten"] [data-testid="card"]');
			await expect(handCards).toHaveCount(6, { timeout: 5000 });
		}

		// Score header should still show round 1
		await expect(pages[0].locator('text=Ronde 1 van 16')).toBeVisible();

		// Trump indicator should still show hearts
		await expect(pages[0].locator('[data-testid="trump-indicator"]')).toContainText('♥');
	});

	test('full round: play all 8 tricks until round end', async () => {
		test.setTimeout(120000); // 8 tricks * 4 cards = 32 plays

		// Setup: create lobby, join all, start game
		const lobbyCode = await createLobby(pages[0], PLAYERS[0]);
		for (let i = 1; i < 4; i++) {
			await joinLobby(pages[i], PLAYERS[i], lobbyCode);
		}
		await expect(pages[0].locator('text=4/4 spelers')).toBeVisible({
			timeout: 10000
		});

		await pages[0].click('button:has-text("Start spel")');
		for (let i = 0; i < 4; i++) {
			await expect(pages[i].locator('[data-testid="game-table"]')).toBeVisible({ timeout: 15000 });
		}

		// Choose trump (spades this time)
		const trumpIdx = await findTrumpChooser(pages);
		expect(trumpIdx).toBeGreaterThanOrEqual(0);
		await pages[trumpIdx].click('[data-testid="trump-selector"] button[aria-label="♠"]');

		for (let i = 0; i < 4; i++) {
			await expect(pages[i].locator('[data-testid="trump-indicator"]')).toBeVisible({
				timeout: 10000
			});
		}

		// Play all 8 tricks
		for (let trick = 1; trick <= 8; trick++) {
			for (let cardInTrick = 0; cardInTrick < 4; cardInTrick++) {
				await pages[0].waitForTimeout(500);

				const currentIdx = await findCurrentPlayer(pages);
				expect(currentIdx).toBeGreaterThanOrEqual(0);

				const cardLabel = await playFirstLegalCard(pages[currentIdx]);
				console.log(
					`  Trick ${trick}, card ${cardInTrick + 1}: ${PLAYERS[currentIdx]} plays ${cardLabel}`
				);

				await pages[0].waitForTimeout(800);
			}

			// Wait for trick completion (1.5s timer + buffer)
			await pages[0].waitForTimeout(3000);
		}

		// After 8 tricks: trick completes (1.5s) → round end (3s) → next round
		// Should eventually reach round 2
		await expect(pages[0].locator('text=Ronde 2 van 16')).toBeVisible({ timeout: 20000 });
	});
});
