# Klaverjas Game Rules Specification (Rotterdam Variant)

## Overview

Klaverjas is a Dutch trick-taking card game for 4 players in fixed partnerships.

## Players and Teams

- 4 players seated in fixed positions: North, East, South, West
- Two teams: North-South (Noord-Zuid) vs West-East (Oost-West)
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

### Trump Suit (Troef)

| Card        | Rank (high to low) | Points |
| ----------- | ------------------ | ------ |
| Jack (Boer) | 1                  | 20     |
| 9 (Nel)     | 2                  | 14     |
| Ace         | 3                  | 11     |
| 10          | 4                  | 10     |
| King        | 5                  | 4      |
| Queen       | 6                  | 3      |
| 8           | 7                  | 0      |
| 7           | 8                  | 0      |

**Total points per round**: 162 (152 from cards + 10 for last trick)

## Hand Display Order

- **Suit order**: Spades, Hearts, Clubs, Diamonds (always this order, regardless of trump)
- **Rank order within suit**: High to low (A-10-K-Q-J-9-8-7 for non-trump, J-9-A-10-K-Q-8-7 for trump)

## Game Flow

### Round Structure

- A full game = 16 rounds
- Each round = 8 tricks (all 32 cards played)
- First dealer is South (seat 0)
- Dealer rotates clockwise each round

### Trump Selection (Troef Maken)

1. Cards are dealt (8 per player)
2. Player left of dealer **must** choose a trump suit (no passing allowed)
3. This player's team becomes the "playing team" (spelende partij)

### Playing Phase

1. Player left of dealer leads the first trick
2. Each player plays one card clockwise
3. The trick winner leads the next trick
4. Continue for 8 tricks

### Playing Rules (Rotterdam)

When a card is led, the correct play is:

1. **Follow suit** if you have a card of the led suit
2. **Trump** if you cannot follow suit AND:
   - The trick doesn't already contain a trump, OR
   - The trick contains a trump and you can play a HIGHER trump
3. **Under-trump** if you cannot follow suit, the trick contains a trump, and you cannot beat it
4. **Play any card** only if you cannot follow suit AND cannot trump

**Rotterdam-specific**: You must ALWAYS trump if possible when you can't follow suit, even if your partner is winning the trick. (Amsterdam rules allow not trumping if partner is winning.)

**Important**: The system does NOT prevent illegal moves. Players can play any card. See Verzaakt section.

### Leading a Trick

- The winner of a trick leads the next trick
- ANY card can be led (no restrictions)
- Trump can be led at any time

### Trick Winner

- Highest trump wins if any trump was played
- Otherwise, highest card of the led suit wins
- Winner collects the trick and leads next

## Verzaakt (Reneging Challenge)

The system does NOT prevent illegal moves. Instead:

1. Players can play ANY card from their hand
2. Any player can call "verzaakt" at any time during the round
3. When verzaakt is called, the caller selects which player they accuse
4. System verifies ALL moves by that player in the current round
5. If an illegal move is found: offending team gets 0 points, other team gets 162, all roem is discarded
6. If all moves were legal: nothing happens (just embarrassing for accuser)

**Verzaakt scope**: All tricks in the current round are checked.

**Multiple violations**: If multiple illegal moves exist, report all of them. Repercussions stay the same.

**Verzaakt timing**: Can be called at any moment during the round. Once a round is complete (8 tricks), verzaakt cannot be called retroactively.

## Scoring

### Base Points

- Sum of card values from tricks won by each team
- Last trick bonus: +10 points

### Roem (Bonus Combinations)

Roem is about the 4 cards in a **single trick** (one from each player). NOT about cards in your hand.

| Combination       | Points | Description                                        |
| ----------------- | ------ | -------------------------------------------------- |
| Three in sequence | 20     | Three consecutive cards of same suit (e.g., 7-8-9) |
| Four in sequence  | 50     | Four consecutive cards of same suit                |
| Stuk              | 20     | King and Queen of trump suit                       |
| Four of a kind    | 100    | Four cards of same rank (e.g., four Jacks)         |

**Sequence order**: 7-8-9-10-J-Q-K-A

**Combined roem**: If cards form multiple combinations, points stack:

- K-Q-J of trump = 20 (sequence) + 20 (stuk) = 40 points
- A-K-Q-J of trump = 50 (4-sequence) + 20 (stuk) = 70 points

**Roem claim values**: 20, 40, 50, 70, or 100

### Roem Claiming Rules

- Anyone can call out roem, but points go to the team that wins the trick
- Roem can be claimed anytime during the trick after you've played a card
- Player clicks "Roem" button, then selects the point value (20/40/50/70/100)
- System validates the claim against cards in the trick
- If claim is wrong: rejected, player can try again with correct amount
- If claim is correct: roem is registered for the trick winner
- After a successful claim, roem button is disabled for everyone until next trick
- Roem can only be claimed while trick is active (during the trick delay). Once trick is collected, no more claims.

### Roem Ownership

Roem ALWAYS goes to the team that wins the trick, regardless of:

- Which team's cards formed the roem
- Which player called out the roem

### Round Result

- **Playing team wins**: Gets their points (cards + roem). Need more than half of total.
  - With no roem: need ≥82 points (more than half of 162)
  - With roem: need more than half of (162 + all roem)
  - Example: 40 total roem → total is 202 → playing team needs ≥102 points
- **Playing team fails** ("Nat"): Gets 0, opponents get 162 + all roem from both teams
- **Pit**: If the playing team wins all 8 tricks, they get 162 + 100 bonus = 262 points. Defending team gets 0.
- **Verzaakt**: Offending team gets 0, other team gets 162, all roem discarded

### Score Display

- Show base points + roem in format: "82 + 20"
- On nat: show "nat" instead of "0" for playing team
- On pit: show "pit" instead of "0" for defending team

### Game Length

- A full game consists of 16 rounds
- Team with most total points after 16 rounds wins
- Tie is an acceptable outcome (draw)

## Edge Cases

1. **Must under-trump**: If you can't follow suit and can't beat the existing trump, you must still play a trump if you have one
2. **Roem validation**: System verifies claimed roem matches cards in trick
3. **Roem in lost trick**: Points go to trick winner, not the team whose cards formed the roem
4. **Defending team wins all tricks**: Playing team just goes "nat" (no pit bonus for defenders)
5. **Four of a kind**: All 4 players must play the same rank in one trick (extremely rare)

## Implementation Notes

- Game state must track: current trick, played cards, trump suit, current player, scores, roem claims
- For verzaakt detection: store hand state at start of each trick to verify legality of moves
- Legal move validation is needed for verzaakt checking, not for prevention
