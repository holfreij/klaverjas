# Multiplayer Specification

## Overview

Real-time multiplayer using Firebase Realtime Database, supporting 4 players + table device.
Spectator mode deferred for later.

## Lobby System

### Creating a Lobby

1. Player enters name (max 50 characters) and clicks "Nieuw spel"
2. System generates unique 6-digit numeric lobby code (e.g., "123456")
3. Host is assigned a player ID and placed in seat 0 (South)
4. Lobby is created in Firebase with "waiting" status
5. Lobby expires after 1 hour of inactivity

### Joining a Lobby

1. Player enters name (max 50 characters) and lobby code
2. System verifies lobby exists → "Lobby niet gevonden" if not
3. System verifies name is unique → reject duplicates
4. Player is assigned a player ID
5. Player can choose any seat (including swapping with others)
6. Real-time sync updates all clients

### Roles

| Role   | Count | Capabilities                                        |
| ------ | ----- | --------------------------------------------------- |
| Player | 4     | See own hand, play cards, claim roem, call verzaakt |
| Table  | 1     | Read-only display of trick area and scores          |

### Seat Assignment

- Seats: 0=Zuid, 1=West, 2=Noord, 3=Oost
- Host is initially seat 0 (Zuid)
- Players can click any seat to switch (swaps instantly if occupied)
- Teams: 0+2 (Noord-Zuid) vs 1+3 (West-Oost)
- 5th position "Tafel" in center for table device

### Lobby Code

- Format: 6 digits (000000-999999)
- Numbers only
- Generated randomly (assume unique, no collision handling)
- Valid for 1 hour

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
			seat: 0 | 1 | 2 | 3 | 'table';
			connected: boolean;
			lastSeen: number;
		};
	};
	game: GameState | null;
}

interface GameState {
	phase: 'trump' | 'playing' | 'trickEnd' | 'roundEnd' | 'gameEnd';
	round: number; // 1-16
	trick: number; // 1-8 within round
	dealer: number; // seat number (0-3)
	trump: Suit | null;
	trumpChooser: number; // seat number who chose trump
	playingTeam: 'ns' | 'we' | null;
	currentPlayer: number; // seat number (0-3)

	// Hand snapshots for verzaakt detection
	handsAtTrickStart: {
		[seat: number]: Card[];
	};
	hands: {
		[seat: number]: Card[];
	};

	currentTrick: PlayedCard[];
	completedTricks: CompletedTrick[];

	scores: {
		ns: { base: number; roem: number };
		we: { base: number; roem: number };
	};

	gameScores: {
		ns: number;
		we: number;
	};

	roemClaimed: boolean; // true if roem was claimed for current trick
	roemClaimPending: {
		playerId: string;
		amount: number;
	} | null;

	skipVotes: string[]; // player IDs who tapped to skip round-end display
}

interface PlayedCard {
	card: Card;
	seat: number;
}

interface CompletedTrick {
	cards: PlayedCard[];
	winner: number; // seat
	roem: number; // points
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
7. Verzaakt called
8. Trick completed
9. Round completed
10. Game completed
11. Skip vote for round-end display

### Optimistic Updates

For smooth UX:

1. Apply action locally immediately
2. Send to Firebase
3. If Firebase rejects, rollback local state

## Connection Handling

### Connection States

| State          | Dutch Message          | Behavior                         |
| -------------- | ---------------------- | -------------------------------- |
| Connecting     | "Verbinding maken..."  | Show on load                     |
| Connected      | (none)                 | Normal gameplay                  |
| Disconnected   | "Verbinding verbroken" | Auto-retry, 5 min timeout        |
| Player offline | "Wachten op [name]..." | Host can dismiss, 1 hour timeout |

### Player Disconnect

- Show "Wachten op [name]..." overlay
- Host can dismiss the overlay for everyone
- If player doesn't reconnect within 1 hour: game ends immediately

### Firebase Disconnect

- Show "Verbinding verbroken"
- Auto-retry in background
- Timeout after 5 minutes → show error

### Session Persistence

- Session stored in localStorage
- Page refresh → automatic rejoin
- Browser close + reopen within 1 hour → automatic rejoin
- Requires re-entering lobby code only if session expired

### Host Disconnect

- If host disconnects in lobby: host role transfers to another player
- If host disconnects during game: same as any player disconnect

## Connection State Machine

```
INITIAL
  │
  ▼ (page load)
CONNECTING ─────────────────────────────────────────┐
  │                                                 │
  │ (Firebase connected)                            │ (Firebase error)
  ▼                                                 ▼
CONNECTED                                       ERROR
  │                                                 │
  │ (Firebase disconnected)                         │ (retry)
  ▼                                                 │
DISCONNECTED ◄──────────────────────────────────────┘
  │
  │ (Firebase reconnected)
  ▼
RECONNECTING
  │
  │ (state sync complete)
  ▼
CONNECTED
```

## Turn Management

### Turn Order

1. First trick of round: Player left of dealer
2. Subsequent tricks: Winner of previous trick
3. Any card can be led (no restrictions)

### Turn Enforcement

- Only `currentPlayer` can play a card
- Cards are NOT validated for legality before playing (verzaakt system)
- Turn advances after each card played

## Lobby Lifecycle

```
CREATED → WAITING → PLAYING → FINISHED
                      ↓↑ (next round)
```

### Cleanup

- Lobbies expire after 1 hour of inactivity
- Lobbies deleted immediately when game ends (after rematch decision)

## Configurable Timings

| Setting       | Default | Description                                   |
| ------------- | ------- | --------------------------------------------- |
| trickDelay    | 1500ms  | Delay after 4th card before trick collection  |
| roundEndDelay | 5000ms  | How long to show round-end scores (skippable) |

## Test Scenarios

### Lobby Tests

- Create lobby generates valid 6-digit code
- Join lobby with valid code succeeds
- Join lobby with invalid code fails with "Lobby niet gevonden"
- Duplicate player names rejected
- Host can start game when 4 players seated
- Non-host cannot start game
- Clicking occupied seat swaps players
- Leaving lobby removes player from Firebase
- Host leaving transfers host to next player
- Table device can join as 5th position

### Connection Tests

- Disconnection updates `connected: false` in Firebase
- Reconnection updates `connected: true` in Firebase
- Session persists across page refresh
- Reconnecting player restores correct seat
- Firebase disconnect shows "Verbinding verbroken"
- Firebase reconnect after retry works

### Game Sync Tests

- Card played syncs to all clients
- Trump selection syncs to all clients
- Trick completion syncs to all clients
- Round completion syncs to all clients
- Roem claim syncs to all clients
- Verzaakt result syncs to all clients
- Skip votes sync and trigger skip when all 4 collected
