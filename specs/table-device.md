# Table Device Mode Specification

## Concept

When playing in the same physical location, players can join from their phones while a tablet/laptop acts as a shared "table" display. This bridges digital and physical play.

## User Flow

### Setup

1. Host creates lobby on any device
2. Host shares lobby code with other players
3. Each player joins on their phone
4. One additional device joins as "table"
5. Tablet/laptop is placed in center of physical table
6. Game starts when 4 players + table are connected

### Joining as Table

1. Open app on tablet/laptop
2. Enter lobby code
3. Select "Join as Table" option (instead of choosing a seat)
4. Device enters table display mode

## Table Display Features

### Primary View: Trick Area

- Large, centered display of current trick
- Cards appear as they are played
- Position-aware: cards appear from the direction of the player who played them
- Clear visual for which card is winning

### Player Positions

```
         [North]
           ↓
  [West] →  □  ← [East]
           ↑
         [South]
```

- Player names displayed at each position
- Turn indicator shows whose turn it is
- Connection status shown (green/gray dot)

### Position Calibration

The table device needs to know which physical seat corresponds to which game seat:

1. On first use, prompt to calibrate:
   - "Who is sitting closest to this edge of the screen?"
   - Options: [North] [South] [East] [West]
2. Store preference in localStorage
3. Allow recalibration via settings

### Information Panels

#### During Play

- Trump suit indicator (large, prominent)
- Current round number
- Trick count (e.g., "Trick 5 of 8")

#### Between Rounds

- Expanded statistics view:
  - Round result (won/lost/"Nat")
  - Points breakdown (card points, roem, last trick bonus)
  - Running game score
  - Roem summary

### Last Trick Feature

- Button or tap to show the last completed trick
- Useful when someone missed what was played
- Auto-dismiss after 5 seconds or on tap

### No Interaction Required

- Table device is purely a display
- Cannot play cards or make decisions
- Touch is only for:
  - Viewing last trick
  - Accessing settings
  - Recalibrating positions

## Technical Implementation

### Firebase Subscription

- Subscribe to lobby state changes
- Real-time updates when cards are played
- Low latency critical for "card appears instantly" feel

### Rendering

- Use CSS transforms for card positioning
- Animate cards sliding in from player positions
- Keep it smooth (60fps target)

### Layout

- Optimize for landscape tablet orientation
- Also support portrait (repositions elements)
- Support various aspect ratios

### Screen Sizes

| Device | Resolution | Considerations |
|--------|------------|----------------|
| iPad | 1024x768 | Primary target |
| Android tablet | 800x1280 | Portrait mode |
| Laptop | 1366x768+ | May be at angle, keep text large |

## Visual Design

### Table Surface

- Green felt texture background
- Cards cast subtle shadow
- Centered trick area

### Card Display

- Larger cards than on phone (easier to see from across table)
- High contrast
- Card values clearly visible

### Typography

- Large, bold text for important info
- Readable from 1-2 meters away
- Sans-serif for clarity

## Edge Cases

### Multiple Table Devices

- Allow multiple devices to join as table (for very large setups)
- All show identical view
- No conflicts

### Table Disconnects

- Game continues without table
- Table reconnects and syncs to current state
- No impact on game flow

### No Table Device

- Perfectly valid to play without table device
- It's an optional enhancement

## Future Enhancements

- Sound effects on card play (optional)
- Victory animations
- Historical game statistics
- QR code display for easy joining
