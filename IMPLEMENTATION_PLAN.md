# Implementation Plan

Current stage: **Stage 4 - Multiplayer Foundation** (Complete)

See [plans/roadmap.md](plans/roadmap.md) for the full project roadmap.

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
- Total: 123 unit tests passing

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

**Stage 5: Full Multiplayer Game** - Complete online play.

Key tasks:
- Private hand view (only see your own cards)
- Turn enforcement (only active player can play)
- Server-side move validation (prevent cheating)
- Trump selection phase (multiplayer)
- Round progression
- Score tracking across rounds
- Game completion and final scores
- Rematch functionality

See [specs/multiplayer.md](specs/multiplayer.md) for multiplayer specifications.
