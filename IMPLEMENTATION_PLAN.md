# Implementation Plan

Current stage: **Stage 4D - Roem & Verzaakt**

See [plans/roadmap.md](plans/roadmap.md) for the full project roadmap.

---

## Stage 2 - Core Game Logic (TDD) - COMPLETED

All implementation followed strict TDD workflow:

1. Enumerate edge cases
2. Write failing test (RED)
3. Implement minimum code (GREEN)
4. Refactor
5. Repeat

### deck.ts - Card and Deck Types

- [x] **Types**: Card, Suit, Rank, Hand
- [x] **createDeck()**: Generate 32-card deck
- [x] **shuffleDeck()**: Randomize deck
- [x] **dealHands()**: Deal 8 cards to each of 4 players
- [x] **sortHand()**: Sort by suit (♠-♥-♣-♦), then by rank within suit

### rules.ts - Legal Moves and Trick Winner

- [x] **getLegalMoves()**: Determine which cards would be legal (for verzaakt validation)
- [x] **isLegalMove()**: Check if specific card is legal to play
- [x] **checkAllMovesInRound()**: Analyze round for verzaakt - returns all illegal moves
- [x] **determineTrickWinner()**: Find winning card in trick
- [x] **getCardStrength()**: Ranking value for comparison (trump vs non-trump)

### scoring.ts - Point Calculation

- [x] **getCardPoints()**: Point value for trump/non-trump
- [x] **calculateTrickPoints()**: Sum of card values in trick
- [x] **calculateRoundResult()**: Determine winner, handle nat/pit
- [x] **calculateMajorityThreshold()**: Points needed to win (half of total + 1)

### roem.ts - Bonus Combinations

- [x] **detectRoem()**: Find all roem in a 4-card trick
- [x] **validateRoemClaim()**: Check if claimed amount matches actual roem
- [x] **getRoemPoints()**: Calculate total roem in trick

### game.ts - Full Game Engine

- [x] **createGame()**: Initialize 16-round game state
- [x] **startRound()**: Deal cards, set dealer, determine trump chooser
- [x] **chooseTrump()**: Set trump suit (mandatory, no passing)
- [x] **playCard()**: Process card play (no validation, just record)
- [x] **claimRoem()**: Process roem claim with validation
- [x] **callVerzaakt()**: Check accused player's moves, determine result
- [x] **completeTrick()**: Handle trick end, award points + roem to winner
- [x] **completeRound()**: Calculate final scores, handle nat/pit
- [x] **isGameComplete()**: Check if 16 rounds done
- [x] **getGameResult()**: Final scores and winner

**Test Results: 153 tests passing**

---

## Stage 1 - Completed

- [x] Initialize SvelteKit project with TypeScript
- [x] Configure Tailwind CSS v4
- [x] Set up Vitest for unit testing
- [x] Configure GitHub Actions for GitHub Pages deployment
- [x] Create CLAUDE.md with project conventions
- [x] Create specs/ directory with initial spec files
- [x] Create plans/roadmap.md
- [x] Set up Firebase project

---

## Stage 3 - Lobby System - COMPLETED

See [specs/multiplayer.md](specs/multiplayer.md) for lobby specifications.

### Multiplayer Infrastructure

- [x] **Firebase initialization** (`src/lib/multiplayer/firebase.ts`)
- [x] **Lobby types** (`src/lib/multiplayer/types.ts`)
  - Lobby, Player, Seat, GameState interfaces
  - Connection state types
  - Session data for localStorage

### Lobby Logic (TDD)

- [x] **generateLobbyCode()**: Random 6-digit code
- [x] **validatePlayerName()**: 3-50 chars, trim whitespace
- [x] **canStartGame()**: Check all 4 seats filled (table doesn't count)
- [x] **getNewHost()**: Find lowest seat number for host transfer

### Firebase Lobby Service

- [x] **createLobby()**: Create lobby, add host at seat 0
- [x] **joinLobby()**: Join with name/code, auto-assign seat
- [x] **leaveLobby()**: Remove player, transfer host, cleanup
- [x] **changeSeat()**: Change seat, swap if occupied
- [x] **startGame()**: Host-only, requires 4 players
- [x] **subscribeLobby()**: Real-time updates
- [x] **reconnect()**: Session persistence via localStorage

### UI Components

- [x] **HomePage**: Create/join lobby forms
- [x] **LobbyRoom**: Table view with seats, player list, start button

### Testing

- [x] Unit tests: 21 tests for lobby logic
- [x] Integration tests: 17 tests for Firebase operations
- [x] E2E tests: 19 Playwright tests for full user flows

**Test Results: 210 tests passing (191 vitest + 19 Playwright)**

---

## Stage 4 - Multiplayer Gameplay

### Stage 4A - Card Visuals - COMPLETED

Card rendering: Simple CSS-based cards with suit symbols (can upgrade to CardMeister SVGs later)

- [x] **Card component** (`src/lib/components/Card.svelte`)
  - CSS-based card rendering with suit symbols
  - Props: card, faceUp, selected, disabled, onClick
  - Red/black suit colors, accessible labels in Dutch
  - 23 tests passing
- [x] **Hand component** (`src/lib/components/Hand.svelte`)
  - Horizontal layout with cards
  - Sorted by suit (♠-♥-♣-♦), then rank (trump/non-trump order)
  - Single tap plays card (no confirmation)
  - Props: cards, trump, onCardPlay, disabled
  - 12 tests passing
- [ ] **Visual polish** - Better card design, sizing for mobile (deferred to 4F)

### Stage 4B - Game Layout - COMPLETED

- [x] **Positions helper** (`src/lib/game/positions.ts`) - relative positions from any seat (20 tests)
- [x] **GameTable component** (`src/lib/components/GameTable.svelte`) - main game view layout (25 tests)
- [x] **Player positions** - partner top, opponents left/right, you bottom
- [x] **TrickArea** - cards played this trick (center), positioned by player
- [x] **Trump indicator** - top-right corner with suit symbol
- [x] **Turn indicator** - glowing border on active player
- [x] **Score header** - both team scores, round number
- [x] **Table device awareness** - boolean flag, hide trick area if table joined
- [x] **OrientationCheck component** - show rotate instruction if portrait
- [x] **Roem/Verzaakt buttons** - near hand, enable/disable logic (stubs for 4D)

### Stage 4C - Game State Sync - COMPLETED

- [x] **Game engine type refactor** - Position→PlayerSeat (0-3), Team→'ns'/'we'
- [x] **State conversion utilities** (`src/lib/multiplayer/gameStateConverter.ts`) - bidirectional engine↔multiplayer conversion (17 tests)
- [x] **Game service** (`src/lib/multiplayer/gameService.ts`) - Firebase game actions: initializeGame, chooseTrump, playCard, completeTrick, startNextRound (17 integration tests)
- [x] **Trump selection UI** (`src/lib/components/TrumpSelector.svelte`) - modal with 4 suit buttons, waiting state (10 tests)
- [x] **Game view wiring** (`src/lib/components/GameView.svelte`) - connects GameTable to live Firebase data
- [x] **Page routing** - HomePage → LobbyRoom → GameView based on lobby status
- [x] **Trick completion with delay** - 1.5s display before auto-completing trick
- [x] **Round progression** - 3s round-end display, auto-advance to next round
- [x] **Round end display** - shows round scores, team totals
- [x] **Game end display** - final scores and winner announcement
- [x] **startGame integration** - host clicking "Start spel" now deals cards and enters trump phase

**Test Results: 471 tests passing**

### Stage 4D - Roem & Verzaakt

- [ ] **Roem button** - enabled after card played, disabled after claim
- [ ] **Roem claim modal** - point value selection (20/40/50/70/100)
- [ ] **Roem validation** - system verifies, show success/error
- [ ] **Verzaakt button** - enabled after card played
- [ ] **Verzaakt accusation** - player selection modal
- [ ] **Verzaakt verification** - check all moves in round, end round if illegal found

### Stage 4E - Round/Game Flow

- [ ] **Round end display** - scores for 5 seconds, skip mechanism
- [ ] **Nat/pit display** - special handling for nat and pit
- [ ] **Game end display** - round-by-round breakdown, winner announcement
- [ ] **Disconnection handling** - waiting overlay, timeout
- [ ] **Rematch functionality** - "Opnieuw spelen" button

### Stage 4F - Polish

- [ ] **Card play animation** - slide from player to center (~500ms)
- [ ] **Trick collection animation** - cards slide to winner (~500ms)
- [ ] **Trick timing delay** - 1-2 seconds after 4th card
- [ ] **Roem claim animation** - highlight cards, sound effect
- [ ] **Loading states** - spinners, skeleton screens
- [ ] **Error states** - connection errors, validation errors
