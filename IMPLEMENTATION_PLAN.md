# Implementation Plan

Current stage: **Stage 2 - Core Game Logic** (Complete)

See [plans/roadmap.md](plans/roadmap.md) for the full project roadmap.

---

## Stage 2 - Completed

### Game Logic Modules (src/lib/game/)

- [x] **deck.ts** - Card and Deck types/utilities
  - Card, Suit, Rank types
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

- 107 unit tests covering all game logic
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

**Stage 3: Single-Device Prototype** - Playable game on one device with UI.

Key tasks:
- Card component (visual representation)
- Hand component (fan of cards)
- Table/trick area component
- Trump indicator
- Score display
- Turn indicator
- "God mode" - control all 4 hands from one device
- Complete game flow UI (dealing, trump selection, playing, scoring)

See [specs/ui-components.md](specs/ui-components.md) for UI component specifications.
