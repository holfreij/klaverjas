# UI Components Specification

## Overview

Mobile-first design using Tailwind CSS. Components built with Svelte 5 runes.
**All UI text must be in Dutch.**
**Orientation: Landscape only.** If device is in portrait, show instruction to rotate.

## Design Philosophy: Realistic Card Game

- **No automatic illegal move prevention** - players can play ANY card
- Other players must call "verzaakt" (reneged) to challenge
- System verifies on challenge, doesn't prevent upfront
- This mirrors real-world card game dynamics

## Card Component

### Visual Design

- Use open-source SVG card library (svg-cards or similar)
- Cards should be clearly readable at mobile sizes
- Card backs: simple solid color
- Suit colors: standard red (hearts/diamonds) and black (clubs/spades)

### Props

```typescript
interface CardProps {
	card: Card;
	faceUp?: boolean; // default: true
	selected?: boolean;
	disabled?: boolean;
	onClick?: () => void;
}
```

## Hand Component (Player's Cards)

### Layout

- Landscape orientation at bottom of screen
- All 8 cards visible without scrolling (overlap as needed)
- Card value and suit must be visible on each card
- Fan/horizontal row shape
- Single tap plays card immediately (no confirmation)

### Sorting

- Suit order: Spades, Hearts, Clubs, Diamonds (fixed, regardless of trump)
- Rank order within suit: High to low
  - Non-trump: A-10-K-Q-J-9-8-7
  - Trump: J-9-A-10-K-Q-8-7
- Trump cards mixed with other suits in standard suit order (NOT grouped separately)

### Props

```typescript
interface HandProps {
	cards: Card[];
	trump: Suit;
	onCardPlay: (card: Card) => void;
	disabled?: boolean;
}
```

## Game Layout (Player View)

### Screen Positions (Landscape)

- **Bottom**: Your hand (cards you can play)
- **Top**: Partner's name (teammate, shows card count only)
- **Left/Right**: Opponents' names (show card count only)
- **Center**: Trick area (cards played this trick)
- **Top-right corner**: Trump indicator + who picked trump

### Position Consistency

Positions must correspond to real-world physical seating:

- Your cards always at bottom
- Partner always at top
- Opponents at left and right based on table position

### Buttons

| Button   | Dutch Label | Position  | State                                                                                           |
| -------- | ----------- | --------- | ----------------------------------------------------------------------------------------------- |
| Roem     | "Roem"      | Near hand | Disabled until a card is played, then enabled. Disabled after successful claim until next trick |
| Verzaakt | "Verzaakt"  | Near hand | Disabled until a card is played, then enabled                                                   |

## Trump Indicator

- Position: Top-right corner
- Shows: Trump suit symbol
- Also shows: Which player picked trump (different colored background on their name)

## Active Player Indicator

- Glowing border around the active player's name/position
- Clear visual distinction for whose turn it is

## Trick Display

### Card Positions

- If table device joined: player UI shows hand only, no trick display
- If no table device: show current trick cards on player UI
- Cards appear from the direction of the player who played them

### Timing

- **Trick delay**: 1-2 seconds after 4th card (configurable)
- During delay: roem and verzaakt can still be called
- After delay: trick is collected

### Animation

- Card play: slides from player position to center (~500ms, should not block next player)
- Trick collection: cards slide toward winner (~500ms, should not block next trick)

## Roem Claim Flow

1. Player taps "Roem" button
2. Show point value buttons: "20", "40", "50", "70", "100"
3. Player taps claimed amount
4. System validates:
   - **Correct**: Knock-on-wood sound, highlight cards, show success message, roem registered
   - **Incorrect**: Brief red flash/shake animation, player can try again

## Verzaakt Claim Flow

1. Player taps "Verzaakt" button
2. Show player selection: which player are you accusing?
3. Player taps accused player
4. System checks ALL moves by that player in current round:
   - **Illegal found**: Round ends, offending team gets 0, other team gets 162, all roem discarded
   - **All legal**: Nothing happens (embarrassing for accuser)

## Score Display

### During Game (Header)

- Compact display
- Both team scores
- Current round number: "Ronde X van 16"

### Round End Display

- Show for ~5 seconds (configurable)
- Most prominent: Both team scores for this round
- Format: "82 + 20" (base + roem, no labels needed)
- Smaller: Running game total
- On nat: show "nat" instead of "0"
- On pit: show "pit" instead of "0"
- Skip mechanism: "Tik om door te gaan" - all 4 players must tap

### Game End Display

- Round-by-round breakdown table
- Columns: Round number, NS base, NS roem, WE base, WE roem
- Grand total at bottom
- Winner announcement (or "Gelijkspel" for draw)
- "Opnieuw spelen" button

## Lobby UI

### Home Screen

- "Nieuw spel" button → create lobby
- "Deelnemen" button → join lobby
- Name input field (before lobby code)
- Max 50 characters for name

### Lobby View (Table from Above)

- Visual: Table viewed from above
- 4 seat positions at edges: Zuid, West, Noord, Oost
- 5th position in center: "Tafel" (table device)
- Team colors: N+S same background, W+E different background (colorblind-friendly)
- Players can click any seat to switch (even occupied seats swap instantly)
- Lobby code: Large font, "Kopiëren" button

### Lobby Code

- Format: 6 digits (numbers only)
- Valid for: 1 hour
- Error for invalid code: "Lobby niet gevonden"
- Duplicate names not allowed

### Host Controls

- "Beginnen" button (visible only to host)
- Enabled when 4 players are seated

## Table Device UI

### Overview

- **Read-only display** - no interaction with game
- Shown on tablet placed on physical table
- Large trick area in center
- Player names at screen edges matching physical positions

### Position Calibration

- Host's phone position = South
- Other positions derive from this
- Table device shows names rotated to match physical seating

### Layout

- Landscape orientation (required)
- Large central trick area
- Player names at edges
- Score display
- Current round number
- Active player indicator (glowing border)

### Animations

- Cards appear from player's direction when played
- Roem claim: glowing borders, flash animation on roem cards
- Trick collection: cards slide toward winner

### Statistics Panel

- Current round number
- Team scores
- Tricks won each team
- Recent roem claims

## Connection States

### Messages

- "Verbinding maken..." (connecting)
- "Verbinding verbroken" (connection lost) + auto-retry
- "Wachten op [name]..." (waiting for player reconnect)

### Player Disconnect

- Show "Wachten op [name]..." overlay
- Host can dismiss for everyone
- Timeout: 1 hour → game ends

### Firebase Disconnect

- Show "Verbinding verbroken"
- Auto-retry in background
- Timeout: 5 minutes → show error

## Screen Orientation

- Landscape only
- If portrait detected: show "Draai je scherm" instruction

## Screen Sleep Prevention

- Prevent screen sleep during active game (if possible)

## Accessibility

- Sufficient color contrast (WCAG AA minimum)
- Colorblind-friendly team colors
- Screen reader labels for cards

## Color Scheme

### Base (Green felt table aesthetic)

- Background: green-900 (#14532d)
- Table surface: green-800 (#166534)
- Text: white/green-100
- Accent: amber/gold for highlights

### Card Colors

- Hearts/Diamonds: red-600
- Clubs/Spades: gray-900 (on white card)

### Status Colors

- Connected: green-500
- Disconnected: gray-400
- Your turn: amber-400 (glowing border)
- Error: red-500
