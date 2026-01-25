# UI Components Specification

## Overview

Mobile-first design using Tailwind CSS. Components built with Svelte 5 runes.

## Card Component

### Visual Design

- Use open-source SVG card library (svg-cards or similar)
- Cards should be clearly readable at mobile sizes
- Selected state: slight lift/glow effect
- Disabled state: grayed out
- Face-down cards for opponents' hands

### Props

```typescript
interface CardProps {
  card: Card;
  faceUp?: boolean;      // default: true
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}
```

### Sizes

| Context | Width | Aspect Ratio |
|---------|-------|--------------|
| In hand | ~60px | 2.5:3.5 |
| On table | ~80px | 2.5:3.5 |
| Mini (history) | ~30px | 2.5:3.5 |

## Hand Component

### Layout

- Fan of cards at bottom of screen (player's hand)
- Cards overlap horizontally
- Selectable cards have slight vertical offset on hover/tap
- Only legal cards are interactive

### Props

```typescript
interface HandProps {
  cards: Card[];
  legalCards: Card[];
  onCardSelect: (card: Card) => void;
}
```

### Mobile Considerations

- Touch targets at least 44px
- Swipe to scroll if many cards
- Visual feedback on tap

## Table Component

### Layout

- Central area showing current trick
- Four positions: top, right, bottom, left (N, E, S, W)
- Player names near their position
- Trump indicator in corner

### Trick Display

- Cards played fan out from center
- Each card positioned near its player's side
- Clear indication of which card wins (border/highlight)
- Animation when card is played

### Props

```typescript
interface TableProps {
  currentTrick: PlayedCard[];
  players: Player[];
  currentPlayer: number;
  trump: Suit;
  myPosition: number;
}
```

## Score Display

### Information Shown

- Team names (North-South / West-East)
- Current round score
- Total game score
- Roem claimed this round

### Layout

- Compact header bar during play
- Expanded view between rounds
- Clear indication of which team is "playing"

## Trump Indicator

### Visual

- Shows current trump suit symbol
- Color-coded (red for hearts/diamonds, black for clubs/spades)
- Always visible during play

## Player Indicator

### Information

- Player name
- Connection status (green dot / gray dot)
- Current turn indicator (animated border or glow)
- Team color (subtle background)

## Lobby UI

### Host View

- Large lobby code for sharing
- List of joined players with seats
- Seat assignment controls
- Start game button (enabled when 4 players)

### Join View

- Input for lobby code
- Name input
- Available seats to choose from
- Ready indicator

## Table Device View

### Differences from Player View

- No hand display
- Larger table/trick area
- All four positions labeled
- Statistics panel:
  - Current round number
  - Scores
  - Tricks won each team
  - Recent roem claims
- Last trick replay button

## Animations

### Card Play

- Card moves from hand to table position
- Duration: ~300ms
- Easing: ease-out

### Trick Collection

- All cards slide toward winner
- Fade out
- Duration: ~500ms

### Turn Indication

- Subtle pulse on current player
- Non-intrusive but noticeable

## Responsive Breakpoints

| Breakpoint | Target |
|------------|--------|
| < 640px | Mobile (primary) |
| 640-1024px | Tablet |
| > 1024px | Desktop |

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
- Your turn: amber-400
- Error: red-500

## Accessibility

- Sufficient color contrast (WCAG AA minimum)
- Screen reader labels for cards
- Keyboard navigation support
- Focus indicators
- Reduced motion option
