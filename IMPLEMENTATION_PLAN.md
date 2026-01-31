# Implementation Plan

Current stage: **Stage 3 - Lobby System**

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

## Stage 3 - Lobby System

See [specs/multiplayer.md](specs/multiplayer.md) for lobby specifications.

- [ ] Firebase data model for lobbies
- [ ] Create lobby functionality
- [ ] Join lobby with seat selection
- [ ] Real-time sync of lobby state
- [ ] Ready/not ready status
- [ ] Start game when all players ready
