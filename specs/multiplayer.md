# Multiplayer Specification

## Overview

Real-time multiplayer using Firebase Realtime Database, supporting 4 players + spectators + table device.

## Lobby System

### Creating a Lobby

1. Player clicks "Host Game"
2. System generates unique 6-character lobby code (e.g., "ABC123")
3. Host is assigned a player ID and placed in seat 0 (South)
4. Lobby is created in Firebase with "waiting" status

### Joining a Lobby

1. Player enters lobby code
2. System verifies lobby exists and has room
3. Player is assigned a player ID
4. Player chooses or is assigned an available seat (1-3)
5. Real-time sync updates all clients

### Roles

| Role | Count | Capabilities |
|------|-------|--------------|
| Player | 4 | See own hand, play cards, claim roem |
| Spectator | Unlimited | See all hands, cannot interact with game |
| Table | 1 | See played cards only, statistics display |

### Seat Assignment

- Seats: 0=South, 1=West, 2=North, 3=East
- Host is always seat 0
- Other players can choose available seats
- Teams: 0+2 (North-South) vs 1+3 (West-East)

## Firebase Data Model

```typescript
interface Lobby {
  code: string;
  host: string; // player ID
  createdAt: number;
  status: 'waiting' | 'playing' | 'finished';
  players: {
    [playerId: string]: {
      name: string;
      seat: number | 'spectator' | 'table';
      connected: boolean;
      lastSeen: number;
    }
  };
  game: GameState | null;
}

interface GameState {
  phase: 'dealing' | 'trump' | 'playing' | 'scoring' | 'roundEnd';
  round: number; // 1-16
  dealer: number; // seat number
  trump: Suit | null;
  playingTeam: 'ns' | 'we' | null;
  currentPlayer: number; // seat number
  hands: {
    [seat: number]: Card[]; // Consider security implications
  };
  currentTrick: PlayedCard[];
  completedTricks: Trick[];
  scores: {
    ns: number;
    we: number;
  };
  roemClaims: RoemClaim[];
}

interface PlayedCard {
  card: Card;
  seat: number;
}

interface RoemClaim {
  seat: number;
  type: 'sequence3' | 'sequence4' | 'stuk' | 'fourOfKind';
  cards: Card[];
  validated: boolean;
  points: number;
}
```

## Real-time Synchronization

### Events to Sync

1. Player joins/leaves lobby
2. Player changes seat
3. Game starts
4. Trump selected
5. Card played
6. Roem claimed
7. Trick completed
8. Round completed
9. Game completed

### Optimistic Updates

For smooth UX:
1. Apply action locally immediately
2. Send to Firebase
3. If Firebase rejects (e.g., invalid move), rollback local state

### Connection Handling

- Track connection status via Firebase `.info/connected`
- Show disconnected players with indicator
- Game pauses if a player disconnects
- Reconnecting player receives full state sync
- Consider timeout for abandoned games (e.g., 5 minutes)

## Security Considerations

### MVP (Trust-based)

- All game state sent to all clients
- UI only shows player's own hand
- Vulnerable to console inspection

### Future Enhancement (Firebase Rules)

```javascript
// Pseudocode for Firebase security rules
{
  "lobbies": {
    "$lobbyCode": {
      "game": {
        "hands": {
          "$seat": {
            ".read": "auth.uid == data.parent().parent().child('players').child(auth.uid).child('seat').val()"
          }
        }
      }
    }
  }
}
```

## Turn Management

### Turn Order

1. First trick: Player left of dealer (seat = (dealer + 1) % 4)
2. Subsequent tricks: Winner of previous trick

### Turn Enforcement

- Only `currentPlayer` can play a card
- Server validates move is legal before accepting
- Illegal moves are rejected with error message

## Lobby Lifecycle

```
CREATED → WAITING → PLAYING → FINISHED
                      ↑___↓ (next round)
```

### Cleanup

- Lobbies are ephemeral (no persistence)
- Auto-delete after game completion + grace period
- Auto-delete if all players disconnect for 30 minutes

## UI State Requirements

### Lobby View

- Show all connected players and their seats
- Indicate ready status
- Host can start game when 4 players seated
- Display shareable lobby code

### Game View

- Show own hand
- Show table with played cards
- Indicate current player
- Show scores
- Show trump indicator
- Roem claim button when applicable

### Table Device View

- No hand display
- Large trick area
- Player positions around table
- Score display
- Last trick replay
- Round statistics between rounds
