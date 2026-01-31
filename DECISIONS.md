# Design Decisions Log

Decisions made during development that should not be re-asked.

## Stage 2 - Core Game Logic

### deck.ts
- **Suit representation**: Use symbols (♠, ♥, ♣, ♦). If spelling out, use Dutch: schoppen, harten, klaver, ruiten
- **Rank representation**: String-based ('7', '8', '9', '10', 'J', 'Q', 'K', 'A')
- **sortHand()**: Does NOT take trump suit. Caller handles trump highlighting in UI

### rules.ts
- **getLegalMoves()**: Returns full list of legal cards
- **isLegalMove()**: Checks if specific card is in getLegalMoves() result (not independent implementation)
- **Trick structure**: Implementation discretion

### game.ts - Verzaakt
- **Who can call**: Anyone, after at least 2 cards played in the trick
- **Call on teammate**: Yes, allowed
- **Multiple verzaakt**: Team who committed illegal move FIRST loses

### game.ts - Roem
- **Timing**: Must claim before next trick starts
- **Previous tricks**: Cannot claim roem for previous tricks
