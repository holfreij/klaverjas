# Implementation Plan

Current stage: **Stage 2 - Core Game Logic** (TDD)

See [plans/roadmap.md](plans/roadmap.md) for the full project roadmap.

---

## Stage 2 - Core Game Logic (TDD)

All implementation MUST follow strict TDD workflow:
1. Enumerate edge cases
2. Write failing test (RED)
3. Implement minimum code (GREEN)
4. Refactor
5. Repeat

### deck.ts - Card and Deck Types

- [ ] **Types**: Card, Suit, Rank, Hand
- [ ] **createDeck()**: Generate 32-card deck
- [ ] **shuffleDeck()**: Randomize deck
- [ ] **dealHands()**: Deal 8 cards to each of 4 players
- [ ] **sortHand()**: Sort by suit (S-H-C-D), then by rank within suit

Edge cases:
- All 4 suits present after creation
- All 8 ranks present after creation (7-A)
- Shuffle produces different order (statistical test)
- Each player gets exactly 8 cards after deal
- No duplicate cards after deal
- Sort order: Spades first, then Hearts, Clubs, Diamonds
- Non-trump rank order: A-10-K-Q-J-9-8-7 (high to low)
- Trump rank order: J-9-A-10-K-Q-8-7 (high to low)

### rules.ts - Legal Moves and Trick Winner

- [ ] **getLegalMoves()**: Determine which cards would be legal (for verzaakt validation)
- [ ] **isLegalMove()**: Check if specific card is legal to play
- [ ] **checkAllMovesInRound()**: Analyze round for verzaakt - returns all illegal moves
- [ ] **determineTrickWinner()**: Find winning card in trick
- [ ] **getCardStrength()**: Ranking value for comparison (trump vs non-trump)

Legal move rules (Rotterdam):
1. Has led suit → must play it
2. No led suit, no trump in trick → must trump if has trump
3. No led suit, trump in trick, has higher trump → must over-trump
4. No led suit, trump in trick, no higher trump, has trump → must under-trump
5. No led suit, no trump → can play anything
6. Rotterdam: must trump even if partner is winning

Edge cases (legal moves):
- Following suit with only one option
- Following suit with multiple options (all legal)
- Must trump when can't follow suit (partner winning, still must trump)
- Must over-trump when existing trump in trick
- Must under-trump when can't over-trump but has lower trump
- Can play anything when can't follow and has no trump
- First card of trick → any card is legal

Edge cases (trick winner):
- No trump played → highest of led suit wins
- One trump played → that trump wins
- Multiple trumps → highest trump wins
- Trump J beats everything (highest trump)
- Trump 9 is second highest

Edge cases (verzaakt detection):
- Multiple illegal moves in same round
- Illegal move in first trick
- Illegal move in last trick
- No illegal moves (valid round)

### scoring.ts - Point Calculation

- [ ] **getCardPoints()**: Point value for trump/non-trump
- [ ] **calculateTrickPoints()**: Sum of card values in trick
- [ ] **calculateRoundResult()**: Determine winner, handle nat/pit
- [ ] **calculateMajorityThreshold()**: Points needed to win (half of total + 1)

Card point values:
- Trump: J=20, 9=14, A=11, 10=10, K=4, Q=3, 8=0, 7=0
- Non-trump: A=11, 10=10, K=4, Q=3, J=2, 9=0, 8=0, 7=0
- Last trick bonus: +10

Edge cases (scoring):
- Total base points always 162 (152 cards + 10 last trick)
- Playing team needs ≥82 to win (no roem)
- With 40 roem: total is 202, need ≥102 to win
- Nat: playing team < threshold → 0 points, opponents get 162 + all roem
- Pit: playing team wins all 8 tricks → 262 points (162 + 100 bonus)
- Draw within a round is not possible (odd total)

### roem.ts - Bonus Combinations

- [ ] **detectRoem()**: Find all roem in a 4-card trick
- [ ] **validateRoemClaim()**: Check if claimed amount matches actual roem
- [ ] **getRoemPoints()**: Calculate total roem in trick

Roem in a trick (4 cards from different players):
- Sequence of 3 same suit: 20 points
- Sequence of 4 same suit: 50 points
- Stuk (K+Q of trump): 20 points
- Four of a kind: 100 points
- Combined: K-Q-J of trump = 40, A-K-Q-J of trump = 70

Edge cases (roem):
- Sequence must be same suit
- Sequence order: 7-8-9-10-J-Q-K-A
- 7-8-9-10 is one sequence of 4 (50), not two of 3
- K-Q of trump in non-trump sequence still adds stuk
- Four of a kind: all 4 players play same rank
- Four Kings including trump K: just 100 (no extra for trump)
- Claim 20: could be 3-sequence OR stuk
- Claim 40: must be 3-sequence AND stuk (K-Q-J trump)
- Claim 50: must be 4-sequence
- Claim 70: must be 4-sequence AND stuk (A-K-Q-J trump)
- Claim 100: must be four of a kind
- Invalid claim rejected (player can retry)

### game.ts - Full Game Engine

- [ ] **createGame()**: Initialize 16-round game state
- [ ] **startRound()**: Deal cards, set dealer, determine trump chooser
- [ ] **chooseTrump()**: Set trump suit (mandatory, no passing)
- [ ] **playCard()**: Process card play (no validation, just record)
- [ ] **claimRoem()**: Process roem claim with validation
- [ ] **callVerzaakt()**: Check accused player's moves, determine result
- [ ] **completeTrick()**: Handle trick end, award points + roem to winner
- [ ] **completeRound()**: Calculate final scores, handle nat/pit
- [ ] **isGameComplete()**: Check if 16 rounds done
- [ ] **getGameResult()**: Final scores and winner

Game flow:
1. Round starts → cards dealt
2. Player left of dealer chooses trump (mandatory)
3. That player's team is "playing team"
4. Player left of dealer leads first trick
5. 8 tricks played
6. Round scored (check nat/pit)
7. Dealer rotates clockwise
8. After 16 rounds → game complete

Edge cases (game flow):
- First dealer is South (seat 0)
- First trump chooser is West (seat 1, left of dealer)
- Dealer rotates: 0→1→2→3→0...
- Winner of trick leads next
- Playing team determined by who chooses trump
- Verzaakt ends round immediately
- All roem discarded on verzaakt
- Pit only for playing team (defenders can't get pit)

State tracking:
- Store hand snapshots at start of each trick (for verzaakt)
- Track all played cards in round
- Track roem claims per trick
- Track which team won each trick

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

## Next Stage Preview

**Stage 3: Lobby System** - Firebase lobby, seat assignment, real-time sync.

See [specs/multiplayer.md](specs/multiplayer.md) for lobby specifications.
