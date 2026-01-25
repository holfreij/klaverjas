# Klaverjas Game Rules Specification (Rotterdam Variant)

## Overview

Klaverjas is a Dutch trick-taking card game for 4 players in fixed partnerships.

## Players and Teams

- 4 players seated in fixed positions: North, East, South, West
- Two teams: North-South vs West-East
- Partners sit across from each other

## The Deck

- 32 cards: 7, 8, 9, 10, J, Q, K, A in four suits (hearts, diamonds, clubs, spades)
- 8 cards dealt to each player

## Card Rankings and Values

### Non-Trump Suits

| Card  | Rank (high to low) | Points |
| ----- | ------------------ | ------ |
| Ace   | 1                  | 11     |
| 10    | 2                  | 10     |
| King  | 3                  | 4      |
| Queen | 4                  | 3      |
| Jack  | 5                  | 2      |
| 9     | 6                  | 0      |
| 8     | 7                  | 0      |
| 7     | 8                  | 0      |

### Trump Suit

| Card       | Rank (high to low) | Points |
| ---------- | ------------------ | ------ |
| Jack (Nel) | 1                  | 20     |
| 9 (Nell)   | 2                  | 14     |
| Ace        | 3                  | 11     |
| 10         | 4                  | 10     |
| King       | 5                  | 4      |
| Queen      | 6                  | 3      |
| 8          | 7                  | 0      |
| 7          | 8                  | 0      |

**Total points per round**: 162 (152 from cards + 10 for last trick)

## Game Flow

### Trump Selection

There are two variants for selecting trump. We implement **Troef Maken** first (simpler), with **Troef Draaien** as a future enhancement.

#### Variant 1: Troef Maken (Implement First)

1. Cards are dealt (8 per player)
2. Player left of dealer **must** choose a trump suit
3. This player's team becomes the "playing team"

#### Variant 2: Troef Draaien (Future Enhancement)

Uses a separate "trump deck" of 20 cards (2-6 of each suit, not used in play).

1. Cards are dealt (8 per player)
2. Draw one card from trump deck - this suit is proposed as trump
3. Starting with player left of dealer, each player can:
   - **Play**: Accept the proposed trump (their team becomes the "playing team")
   - **Pass**: Decline, next player decides
4. If all 4 players pass:
   - Draw another card from trump deck (must be different suit; keep drawing until different, reshuffle when depleted)
   - Repeat step 3
5. If all 4 players pass again:
   - Reshuffle all 32 cards, deal new hands
   - Don't reshuffle trump deck (unless it is depleted), draw new trump card
   - Repeat until someone plays

### Playing Phase

1. Player left of dealer leads the first trick
2. Each player plays one card clockwise
3. The trick winner leads the next trick
4. Continue for 8 tricks

### Playing Rules (Rotterdam)

When a card is led, you must:

1. **Follow suit** if you have a card of the led suit
2. **Trump** if you cannot follow suit AND:
   - The trick doesn't already contain a trump, OR
   - The trick contains a trump and you can play a HIGHER trump
3. **Under-trump** if you cannot follow suit, the trick contains a trump, and you cannot beat it
4. **Play any card** only if you cannot follow suit AND cannot trump

**Rotterdam-specific**: You must ALWAYS trump if possible when you can't follow suit, even if your partner is winning the trick. (Amsterdam rules allow not trumping if partner is winning.)

### Trick Winner

- Highest trump wins if any trump was played
- Otherwise, highest card of the led suit wins
- Winner collects the trick and leads next

## Scoring

### Base Points

- Sum of card values from tricks won by each team
- Last trick bonus: +10 points

### Roem (Bonus Combinations)

Roem must be **manually claimed** by players. The system validates claims.

| Combination       | Points | Description                                        |
| ----------------- | ------ | -------------------------------------------------- |
| Three in sequence | 20     | Three consecutive cards of same suit (e.g., 7-8-9) |
| Four in sequence  | 50     | Four consecutive cards of same suit                |
| Stuk              | 20     | King and Queen of trump suit                       |
| Four of a kind    | 100    | Four cards of same rank (e.g., four Jacks)         |

**Sequence order**: 7-8-9-10-J-Q-K-A

**Roem ownership**: Roem is awarded to the team that **wins the trick** in which the roem cards are played. If you claim roem but lose the trick, the opponents get your roem points.

**Roem timing**: Can be claimed when playing a card that is part of the combination.

**Stacked roem**: If King-Queen of trump appear in a sequence, both bonuses apply (e.g., Q-K-A of trump = 20 for stuk + 20 for sequence = 40).

### Round Result

- **Playing team wins**: Gets their points (cards + roem)
- **Playing team fails** ("Nat"): Gets 0, opponents get 162 + all roem
- **Pit**: If the **playing team** wins all 8 tricks, they get +100 bonus points. (If the defending team wins all tricks, no pit bonus is awarded - this is just a regular "nat" for the playing team.)

### Game Length

- A full game consists of 16 rounds
- Team with most total points after 16 rounds wins

## Edge Cases

1. **All pass (Troef Draaien only)**: Draw new trump card, repeat. If all pass again, redeal.
2. **Must under-trump**: If you can't follow suit and can't beat the existing trump, you must still play a trump if you have one
3. **Roem validation**: System should verify claimed roem actually exists in the cards played
4. **Roem in lost trick**: If you claim roem but lose the trick, opponents get those roem points
5. **Defending team wins all tricks**: This is NOT a pit - playing team just goes "nat" with no pit bonus for defenders

## Implementation Notes

- Game state must track: current trick, played cards, trump suit, current player, scores, roem claims
- Legal move validation is critical for multiplayer fairness
- Roem detection logic needed for claim validation
