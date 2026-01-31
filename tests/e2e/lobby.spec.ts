import { test, expect, type Page } from '@playwright/test';

// Helper to clear localStorage between tests
async function clearStorage(page: Page) {
	await page.evaluate(() => localStorage.clear());
}

// Helper to create a lobby and return the code
async function createLobby(page: Page, playerName: string): Promise<string> {
	await page.goto('/');
	await clearStorage(page);
	await page.reload();

	await page.fill('#playerName', playerName);
	await page.click('button:has-text("Maak lobby")');

	// Wait for lobby room to appear
	await expect(page.locator('p:has-text("Lobby code")')).toBeVisible({ timeout: 10000 });

	// Get the lobby code
	const codeButton = page.locator('button.text-3xl');
	const code = await codeButton.textContent();
	return code?.trim() || '';
}

// Helper to join a lobby
async function joinLobby(page: Page, playerName: string, lobbyCode: string) {
	await page.goto('/');
	await clearStorage(page);
	await page.reload();

	await page.fill('#playerName', playerName);
	await page.fill('#lobbyCode', lobbyCode);

	// Wait for button to be enabled
	const joinButton = page.locator('button:has-text("Deelnemen")');
	await expect(joinButton).toBeEnabled({ timeout: 5000 });
	await joinButton.click();

	// Wait for lobby room
	await expect(page.locator('p:has-text("Lobby code")')).toBeVisible({ timeout: 10000 });
}

test.describe('Lobby System E2E', () => {
	test.describe('Home Page', () => {
		test('should display create and join sections', async ({ page }) => {
			await page.goto('/');

			await expect(page.locator('h1:has-text("Klaverjas")')).toBeVisible();
			await expect(page.locator('h2:has-text("Nieuw spel")')).toBeVisible();
			await expect(page.locator('h2:has-text("Deelnemen")')).toBeVisible();
			await expect(page.locator('#playerName')).toBeVisible();
		});

		test('should disable create button when name is empty', async ({ page }) => {
			await page.goto('/');

			const createButton = page.locator('button:has-text("Maak lobby")');
			await expect(createButton).toBeDisabled();
		});

		test('should enable create button when name is entered', async ({ page }) => {
			await page.goto('/');

			await page.fill('#playerName', 'TestPlayer');
			const createButton = page.locator('button:has-text("Maak lobby")');
			await expect(createButton).toBeEnabled();
		});

		test('should disable join button when name or code is missing', async ({ page }) => {
			await page.goto('/');

			const joinButton = page.locator('button:has-text("Deelnemen")');
			await expect(joinButton).toBeDisabled();

			// Just name
			await page.fill('#playerName', 'TestPlayer');
			await expect(joinButton).toBeDisabled();

			// Just code (clear name first)
			await page.fill('#playerName', '');
			await page.fill('#lobbyCode', '123456');
			await expect(joinButton).toBeDisabled();
		});

		test('should filter non-numeric input and enable button with valid code', async ({ page }) => {
			await page.goto('/');

			// Fill name first
			await page.fill('#playerName', 'TestPlayer');

			// Fill with mixed characters - the derived value filters to digits only
			await page.fill('#lobbyCode', 'abc123def456');

			// The raw value is stored, but the derived lobbyCode will filter it
			// Button should be enabled because the filtered value is 6 digits
			const joinButton = page.locator('button:has-text("Deelnemen")');
			await expect(joinButton).toBeEnabled();
		});
	});

	test.describe('Create Lobby', () => {
		test('should create a lobby and show lobby room', async ({ page }) => {
			const code = await createLobby(page, 'Creator');

			expect(code).toMatch(/^\d{6}$/);
			await expect(page.locator('text=1/4 spelers')).toBeVisible();
			await expect(page.locator('text=Creator')).toBeVisible();
			// Check Host label is shown (the exact text "Host" in the small span)
			await expect(page.locator('span.text-xs:has-text("Host")')).toBeVisible();
		});

		test('should show error for invalid name', async ({ page }) => {
			await page.goto('/');

			await page.fill('#playerName', 'ab'); // Too short
			await page.click('button:has-text("Maak lobby")');

			await expect(page.locator('text=minimaal 3 tekens')).toBeVisible();
		});

		test('should place host at Zuid (seat 0)', async ({ page }) => {
			await createLobby(page, 'HostPlayer');

			// The Zuid seat should show the host
			const zuidSeat = page.locator('button:has-text("Zuid")');
			await expect(zuidSeat).toContainText('HostPlayer');
		});
	});

	test.describe('Join Lobby', () => {
		test('should join an existing lobby', async ({ browser }) => {
			// Host creates lobby
			const hostContext = await browser.newContext();
			const hostPage = await hostContext.newPage();
			const code = await createLobby(hostPage, 'Host');

			// Player joins
			const playerContext = await browser.newContext();
			const playerPage = await playerContext.newPage();
			await joinLobby(playerPage, 'Player2', code);

			// Both should see 2 players
			await expect(hostPage.locator('text=2/4 spelers')).toBeVisible();
			await expect(playerPage.locator('text=2/4 spelers')).toBeVisible();

			// Player2 should be visible on both pages
			await expect(hostPage.locator('text=Player2')).toBeVisible();
			await expect(playerPage.locator('text=Player2')).toBeVisible();

			await hostContext.close();
			await playerContext.close();
		});

		test('should show error for invalid lobby code', async ({ page }) => {
			await page.goto('/');

			await page.fill('#playerName', 'Player');
			await page.fill('#lobbyCode', '999999');

			// Wait for button to be enabled
			const joinButton = page.locator('button:has-text("Deelnemen")');
			await expect(joinButton).toBeEnabled();
			await joinButton.click();

			await expect(page.locator('text=Lobby niet gevonden')).toBeVisible();
		});

		test('should show error for duplicate name', async ({ browser }) => {
			// Host creates lobby
			const hostContext = await browser.newContext();
			const hostPage = await hostContext.newPage();
			const code = await createLobby(hostPage, 'SameName');

			// Player tries to join with same name
			const playerContext = await browser.newContext();
			const playerPage = await playerContext.newPage();
			await playerPage.goto('/');
			await playerPage.fill('#playerName', 'SameName');
			await playerPage.fill('#lobbyCode', code);

			// Wait for button to be enabled and click
			const joinButton = playerPage.locator('button:has-text("Deelnemen")');
			await expect(joinButton).toBeEnabled();
			await joinButton.click();

			await expect(playerPage.locator('text=naam is al in gebruik')).toBeVisible();

			await hostContext.close();
			await playerContext.close();
		});
	});

	test.describe('Seat Selection', () => {
		test('should allow changing seats', async ({ browser }) => {
			const hostContext = await browser.newContext();
			const hostPage = await hostContext.newPage();
			await createLobby(hostPage, 'Host');

			// Click on Noord seat
			await hostPage.click('button:has-text("Noord")');

			// Host should now be at Noord
			const noordSeat = hostPage.locator('button:has-text("Noord")');
			await expect(noordSeat).toContainText('Host');

			await hostContext.close();
		});

		test('should swap seats when clicking occupied seat', async ({ browser }) => {
			// Create lobby with 2 players
			const hostContext = await browser.newContext();
			const hostPage = await hostContext.newPage();
			const code = await createLobby(hostPage, 'Host');

			const playerContext = await browser.newContext();
			const playerPage = await playerContext.newPage();
			await joinLobby(playerPage, 'Player2', code);

			// Player2 clicks on Host's seat (Zuid)
			await playerPage.click('button:has-text("Zuid"):has-text("Host")');

			// Wait for swap to complete
			await expect(playerPage.locator('button:has-text("Zuid")')).toContainText('Player2');
			await expect(hostPage.locator('button:has-text("West")')).toContainText('Host');

			await hostContext.close();
			await playerContext.close();
		});
	});

	test.describe('Start Game', () => {
		test('should disable start button with less than 4 players', async ({ page }) => {
			await createLobby(page, 'Host');

			// Start button should not be visible (showing "Wacht op meer spelers...")
			await expect(page.locator('text=Wacht op meer spelers')).toBeVisible();
			await expect(page.locator('button:has-text("Start spel")')).not.toBeVisible();
		});

		test('should enable start button with 4 players', async ({ browser }) => {
			// Create lobby with 4 players
			const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
			const pages: Page[] = [];

			// Host
			const hostContext = await browser.newContext();
			const hostPage = await hostContext.newPage();
			const code = await createLobby(hostPage, 'Host');
			contexts.push(hostContext);
			pages.push(hostPage);

			// 3 more players
			for (let i = 2; i <= 4; i++) {
				const ctx = await browser.newContext();
				const pg = await ctx.newPage();
				await joinLobby(pg, `Player${i}`, code);
				contexts.push(ctx);
				pages.push(pg);
			}

			// Host should see start button
			await expect(hostPage.locator('button:has-text("Start spel")')).toBeVisible();
			await expect(hostPage.locator('button:has-text("Start spel")')).toBeEnabled();

			// Non-host should see "Wacht op host"
			await expect(pages[1].locator('text=Wacht op host om te starten')).toBeVisible();

			// Clean up
			for (const ctx of contexts) {
				await ctx.close();
			}
		});

		test('should start game when host clicks start', async ({ browser }) => {
			// Create lobby with 4 players
			const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];

			const hostContext = await browser.newContext();
			const hostPage = await hostContext.newPage();
			const code = await createLobby(hostPage, 'Host');
			contexts.push(hostContext);

			for (let i = 2; i <= 4; i++) {
				const ctx = await browser.newContext();
				const pg = await ctx.newPage();
				await joinLobby(pg, `Player${i}`, code);
				contexts.push(ctx);
			}

			// Host clicks start
			await hostPage.click('button:has-text("Start spel")');

			// The lobby status should change to "playing"
			// For now we just verify the button is no longer visible after click
			await expect(hostPage.locator('button:has-text("Start spel")')).not.toBeVisible({
				timeout: 5000
			});

			for (const ctx of contexts) {
				await ctx.close();
			}
		});
	});

	test.describe('Leave Lobby', () => {
		test('should return to home page after leaving', async ({ page }) => {
			await createLobby(page, 'Host');

			await page.click('text=Verlaat lobby');

			// Should be back at home page
			await expect(page.locator('h1:has-text("Klaverjas")')).toBeVisible();
			await expect(page.locator('text=Nieuw spel')).toBeVisible();
		});

		test('should transfer host when host leaves', async ({ browser }) => {
			// Host creates lobby
			const hostContext = await browser.newContext();
			const hostPage = await hostContext.newPage();
			const code = await createLobby(hostPage, 'FirstPlayer');

			// Player joins
			const playerContext = await browser.newContext();
			const playerPage = await playerContext.newPage();
			await joinLobby(playerPage, 'SecondPlayer', code);

			// Verify SecondPlayer is NOT host yet
			const secondPlayerSeat = playerPage.locator('button:has-text("SecondPlayer")');
			await expect(secondPlayerSeat).not.toContainText('Host');

			// Host leaves
			await hostPage.click('text=Verlaat lobby');

			// Wait for host transfer - SecondPlayer should now be host
			await expect(
				playerPage
					.locator('button:has-text("SecondPlayer")')
					.locator('span.text-xs:has-text("Host")')
			).toBeVisible({ timeout: 5000 });

			await hostContext.close();
			await playerContext.close();
		});
	});

	test.describe('Session Persistence', () => {
		test('should reconnect after page refresh', async ({ page }) => {
			const code = await createLobby(page, 'PersistentPlayer');

			// Refresh the page
			await page.reload();

			// Should still be in the lobby
			await expect(page.locator('text=Lobby code')).toBeVisible({ timeout: 10000 });
			await expect(page.locator(`text=${code}`)).toBeVisible();
			await expect(page.locator('text=PersistentPlayer')).toBeVisible();
		});
	});
});
