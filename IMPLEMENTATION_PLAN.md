# Implementation Plan

Current stage: **Stage 3 - Single-Device Prototype** (Complete)

See [plans/roadmap.md](plans/roadmap.md) for the full project roadmap.

---

## Stage 3 - Completed

### UI Components (src/lib/components/)

- [x] **Card.svelte** - Visual card representation
  - Face-up/face-down display
  - Suit symbols with appropriate colors
  - Selected and disabled states
  - Three sizes: small, medium, large

- [x] **Hand.svelte** - Fan of cards
  - Horizontal layout with overlap
  - Legal move highlighting
  - Click handling for card selection
  - Support for different positions

- [x] **Table.svelte** - Trick area
  - Four positions for played cards (N, E, S, W)
  - Player names with turn indicator
  - Trump indicator
  - Central play area

- [x] **TrumpIndicator.svelte** - Trump display
  - Shows current trump suit
  - Playing team indicator

- [x] **TrumpSelector.svelte** - Trump selection UI
  - Grid of four suits
  - Player name display

- [x] **ScoreDisplay.svelte** - Score tracking
  - Current round and total rounds
  - Team scores (NS vs WE)
  - Playing team highlight

### State Management (src/lib/stores/)

- [x] **gameStore.svelte.ts** - Reactive game state
  - Wraps game engine with Svelte 5 runes
  - Exposes state and actions
  - Legal moves calculation per player

### Game Page (src/routes/play/)

- [x] **+page.svelte** - Full game interface
  - God mode: all 4 hands visible
  - Trump selection phase
  - Playing phase with card selection
  - Game over overlay with final scores
  - New game functionality

---

## Stage 2 - Completed (Previously)

### Game Logic Modules (src/lib/game/)

- [x] **deck.ts** - Card and Deck types/utilities
  - Card, Suit, Rank types (Dutch suit names)
  - createDeck(), shuffle(), deal() functions
  - getCardPoints(), compareCards() for scoring/comparison
  - cardToString() for debugging

- [x] **rules.ts** - Legal move validation and trick winner
  - getLegalMoves() - Rotterdam rules enforcement
  - getTrickWinner() - Determines trick winner
  - PlayedCard type

- [x] **scoring.ts** - Point calculation and round result
  - calculateTrickPoints() - Sum card values
  - calculateRoundResult() - Handles nat, pit, roem
  - getPlayerTeam() - Team assignment
  - TrickResult, TeamScores types

- [x] **roem.ts** - Bonus combinations
  - detectSequences() - 3+ consecutive cards
  - detectStuk() - K+Q of trump
  - detectFourOfAKind() - Four of same rank
  - detectAllRoem() - Combined detection
  - validateRoemClaim() - Player claim validation

- [x] **game.ts** - Full game engine
  - createGame() - Initialize new game
  - chooseTrump() - Trump selection (Troef Maken)
  - playCard() - Play card with validation
  - claimRoem() - Roem claiming
  - Complete 16-round game flow

### Test Coverage

- 106 unit tests covering all game logic
- Tests in tests/unit/: deck.test.ts, rules.test.ts, scoring.test.ts, roem.test.ts, game.test.ts

---

## Stage 1 - Completed (Previously)

- [x] Initialize SvelteKit project with TypeScript
- [x] Configure Tailwind CSS v4
- [x] Set up Vitest for unit testing
- [x] Configure GitHub Actions for GitHub Pages deployment
- [x] Create CLAUDE.md with project conventions
- [x] Create specs/ directory with initial spec files
- [x] Create plans/roadmap.md

### Pending from Stage 1
- [ ] Set up basic PWA manifest
- [ ] Set up Firebase project (requires manual console setup)
- [ ] Verify deployment to GitHub Pages (push to main, check Actions)

---

## Next Stage Preview

**Stage 4: Multiplayer Foundation** - Lobby system and state sync.

Key tasks:
- Firebase Realtime Database schema design
- Lobby creation (generates shareable code)
- Lobby joining (enter code)
- Player session management (nickname, seat assignment)
- Real-time state synchronization
- Connection status handling
- Player disconnect/reconnect handling

See [specs/multiplayer.md](specs/multiplayer.md) for multiplayer specifications.
