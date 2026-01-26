# Implementation Plan

Current stage: **Stage 5 - Full Multiplayer Game** (Complete)

See [plans/roadmap.md](plans/roadmap.md) for the full project roadmap.

---

## Stage 5 - Complete

### Firebase Game Operations (src/lib/multiplayer/game.ts)

- [x] **startGame()** - Initialize game state in Firebase
  - Creates dealt hands, sets phase to 'trump'
  - Updates lobby status to 'playing'

- [x] **selectTrump()** - Player selects trump suit
  - Validates it's the player's turn
  - Sets trump and playing team

- [x] **playCardMultiplayer()** - Play a card with validation
  - Validates it's player's turn
  - Validates card is in hand
  - Validates move is legal (rules check)
  - Updates game state in Firebase
  - Handles trick completion

- [x] **claimRoemMultiplayer()** - Handle roem claims
  - Validates claim against player's cards
  - Adds validated claim to game state

- [x] **subscribeGame()** - Real-time game state sync

- [x] **requestRematch()** - Reset game for new game

- [x] **Helper functions** - isPlayerTurn, getHandForSeat, getLegalMovesForPlayer

### Multiplayer Game Store (src/lib/stores/)

- [x] **multiplayerGameStore.svelte.ts** - Reactive game state
  - Firebase sync integration
  - Private hand view (only player's own hand)
  - Turn enforcement helpers
  - Game actions (selectTrump, playCard, claimRoem)

### UI Updates

- [x] **lobby/+page.svelte** - Start game functionality
  - Implement handleStartGame() to call startGame()
  - Navigate to game page when game starts

- [x] **game/+page.svelte** - Multiplayer game page
  - Private hand view (only see own cards)
  - Other players show card count only
  - Turn indicator and enforcement
  - Trump selection phase UI
  - Score display

### Game Flow

- [x] Trump selection phase (multiplayer)
- [x] Round progression with Firebase sync
- [x] Score tracking across rounds
- [x] Game completion detection
- [x] Final scores display
- [x] Rematch functionality

### Test Coverage

- [x] Unit tests for game.ts functions (19 new tests)
- Total: 142 unit tests passing

---

## Stage 4 - Completed

### Firebase Integration (src/lib/multiplayer/)

- [x] **firebase.ts** - Firebase configuration and initialization
  - Firebase app and database initialization
  - Singleton pattern for safe re-initialization

- [x] **types.ts** - Multiplayer TypeScript types
  - Lobby, LobbyPlayer, LocalSession types
  - MultiplayerGameState for future game sync
  - Seat type (0-3, 'spectator', 'table')

- [x] **lobby.ts** - Lobby service
  - createLobby() - Generate 6-char code, join as host
  - joinLobby() - Enter code, auto-assign seat
  - leaveLobby() - Leave and cleanup
  - changeSeat() - Switch seats
  - subscribeLobby() - Real-time lobby updates
  - isLobbyFull(), getPlayersBySeat() - Utility functions

- [x] **session.ts** - Player session management
  - saveSession(), loadSession(), clearSession() - LocalStorage
  - Session persistence for reconnection

- [x] **connection.ts** - Connection status handling
  - subscribeConnectionStatus() - Firebase .info/connected
  - ConnectionStatus type (connecting, connected, disconnected)

- [x] **index.ts** - Module exports

### Lobby Store (src/lib/stores/)

- [x] **lobbyStore.svelte.ts** - Svelte 5 reactive store
  - Firebase sync integration
  - Session persistence
  - Auto-reconnection on page refresh
  - Connection status tracking
  - Host/join/leave actions

### UI Components (src/lib/components/)

- [x] **ConnectionStatus.svelte** - Connection indicator
  - Animated connecting state
  - Color-coded status

- [x] **LobbyPlayerList.svelte** - Player list with seats
  - 4 seat positions (South, West, North, East)
  - Team indicators (NS/WE)
  - Click to change seat
  - Online/offline status
  - Host badge

### Pages (src/routes/)

- [x] **+page.svelte** - Updated home page
  - Host Game button → create lobby
  - Join Game button → enter code
  - Local Play button → single-device mode
  - Connection status indicator

- [x] **lobby/+page.svelte** - Lobby waiting room
  - Display lobby code (click to copy)
  - Player list with seat selection
  - Host can start game when full
  - Leave lobby button

### Test Coverage

- 17 new unit tests for lobby utilities

---

## Stage 3 - Completed (Previously)

### UI Components (src/lib/components/)

- [x] **Card.svelte** - Visual card representation
- [x] **Hand.svelte** - Fan of cards
- [x] **Table.svelte** - Trick area
- [x] **TrumpIndicator.svelte** - Trump display
- [x] **TrumpSelector.svelte** - Trump selection UI
- [x] **ScoreDisplay.svelte** - Score tracking

### State Management (src/lib/stores/)

- [x] **gameStore.svelte.ts** - Reactive game state

### Game Page (src/routes/play/)

- [x] **+page.svelte** - Full game interface (god mode)

---

## Stage 2 - Completed (Previously)

### Game Logic Modules (src/lib/game/)

- [x] **deck.ts** - Card and Deck types/utilities
- [x] **rules.ts** - Legal move validation and trick winner
- [x] **scoring.ts** - Point calculation and round result
- [x] **roem.ts** - Bonus combinations
- [x] **game.ts** - Full game engine

### Test Coverage

- 106 unit tests covering all game logic

---

## Stage 1 - Completed (Previously)

- [x] Initialize SvelteKit project with TypeScript
- [x] Configure Tailwind CSS v4
- [x] Set up Vitest for unit testing
- [x] Configure GitHub Actions for GitHub Pages deployment
- [x] Create CLAUDE.md with project conventions
- [x] Create specs/ directory with initial spec files
- [x] Create plans/roadmap.md
- [x] Set up Firebase project

### Pending from Stage 1
- [ ] Set up basic PWA manifest
- [ ] Verify deployment to GitHub Pages (push to main, check Actions)

---

## Next Stage Preview

**Stage 6: Advanced Features** - Spectator and Table modes.

Key tasks:
- Spectator role in lobby (can see all hands)
- Table device mode (shows played cards only)
- Between-round statistics
- Last trick replay
- Visual feedback when cards are played
- Sound effects (optional)

See [specs/table-device.md](specs/table-device.md) for table device specifications.
