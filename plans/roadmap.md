# Klaverjas Online - Development Roadmap

## Project Vision

An online multiplayer Klaverjas card game (Rotterdam rules) as a PWA, deployed on GitHub Pages, with a unique "table device" feature for local play.

## Tech Stack

| Layer     | Technology                 | Rationale                                                                     |
| --------- | -------------------------- | ----------------------------------------------------------------------------- |
| Framework | SvelteKit                  | Small bundles, great reactivity for real-time state, excellent static adapter |
| Language  | TypeScript                 | Type safety for complex game logic                                            |
| Styling   | Tailwind CSS v4            | Rapid UI development, mobile-first utilities                                  |
| Real-time | Firebase Realtime Database | Free tier, easy setup, reliable sync                                          |
| Build     | Vite (via SvelteKit)       | Fast builds, excellent PWA plugins                                            |
| PWA       | vite-plugin-pwa            | Service workers, manifest, install prompts                                    |
| Testing   | Vitest + Playwright        | Unit tests for game logic, E2E for flows                                      |
| CI/CD     | GitHub Actions             | Auto-deploy to GitHub Pages on push                                           |

## Documentation Structure

| Document                 | Purpose                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `CLAUDE.md`              | Project constitution for AI - rules, conventions, quick reference |
| `IMPLEMENTATION_PLAN.md` | Living document - current stage tasks, detailed progress          |
| `plans/roadmap.md`       | Stable reference - vision, all stages overview, architecture      |
| `DECISIONS.md`           | Decision log - choices made during development                    |
| `specs/*.md`             | Requirements - detailed feature specifications                    |

## Project Structure

```
klaverjas/
├── CLAUDE.md                    # Project constitution for AI assistance
├── IMPLEMENTATION_PLAN.md       # Living prioritized task list (current stage)
├── DECISIONS.md                 # Design decisions log
├── plans/
│   ├── roadmap.md              # This document (permanent reference)
│   └── stage-N-*.md            # Stage-specific detailed plans
├── specs/                       # Requirements documents
│   ├── game-rules.md           # Klaverjas Rotterdam rules
│   ├── multiplayer.md          # Lobby, sync, turn management
│   ├── ui-components.md        # Card, hand, table components
│   └── table-device.md         # The "table" mode feature
├── src/
│   ├── lib/
│   │   ├── game/               # Pure TypeScript game logic (no Svelte dependencies)
│   │   │   ├── deck.ts
│   │   │   ├── rules.ts
│   │   │   ├── scoring.ts
│   │   │   ├── roem.ts
│   │   │   └── game.ts
│   │   ├── multiplayer/        # Firebase integration
│   │   ├── components/         # Svelte components
│   │   └── stores/             # Svelte stores for state
│   ├── routes/                 # SvelteKit pages
│   └── app.css                 # Tailwind entry point
├── tests/
│   ├── unit/                   # Vitest unit tests
│   ├── integration/            # Vitest integration tests (Firebase)
│   └── e2e/                    # Playwright E2E tests
└── static/                     # PWA assets, card images
```

---

## Development Stages

### Stage 1: Foundation ✓

**Goal:** Deployable skeleton with CI/CD

- [x] Initialize SvelteKit project with TypeScript
- [x] Configure Tailwind CSS
- [x] Set up Vitest for unit testing
- [x] Configure GitHub Actions for GitHub Pages deployment
- [x] Create CLAUDE.md with project conventions
- [x] Create specs/ directory with initial spec files
- [x] Set up Firebase project (Realtime Database)

**Deliverable:** Empty app deploys to GitHub Pages automatically

---

### Stage 2: Core Game Logic ✓

**Goal:** Complete, tested Klaverjas rules engine (TDD rebuild)

- [x] Card and Deck types/utilities
- [x] Dealing mechanism (8 cards each)
- [x] Trump suit mechanics (Rotterdam rules)
- [x] Legal move validation (follow suit, must trump, etc.)
- [x] Verzaakt detection (check if any move in round was illegal)
- [x] Trick winner determination
- [x] Scoring system (card points + final trick bonus)
- [x] Roem detection logic (sequences, stuk, four-of-a-kind)
- [x] Roem claim validation (player claims, system verifies)
- [x] "Nat" logic (playing team fails OR verzaakt confirmed)
- [x] Pit bonus (winning all tricks)
- [x] Full game flow (16 rounds)

**Deliverable:** 153 unit tests, 100% tested game logic

---

### Stage 3: Lobby System ✓

**Goal:** Create/join lobby, seat assignment, Firebase sync

- [x] Firebase Realtime Database schema implementation
- [x] Lobby creation (generates shareable 6-digit code)
- [x] Lobby joining (enter code)
- [x] Player session management (nickname, seat assignment)
- [x] Seat selection/changing (with swap)
- [x] Real-time lobby state synchronization
- [x] Connection status tracking
- [x] Session persistence (localStorage)
- [x] Reconnection handling
- [x] Host transfer on disconnect

**Deliverable:** 210 tests (unit + integration + E2E), full lobby UI

---

### Stage 4: Multiplayer Gameplay

**Goal:** Cards, turns, scoring, verzaakt, disconnection handling

- [ ] Card component (visual representation)
- [ ] Hand component (fan/waaier of cards)
- [ ] Table/trick area component
- [ ] Trump indicator
- [ ] Score display
- [ ] Turn indicator
- [ ] Private hand view (only see own cards)
- [ ] Any card playable (no automatic prevention)
- [ ] Roem claim button and validation
- [ ] Verzaakt button and verification
- [ ] Trump selection phase (multiplayer)
- [ ] Trick timing (1-2 second delay)
- [ ] Round progression with Firebase sync
- [ ] Disconnection handling with timeout
- [ ] Game completion and final scores
- [ ] Rematch functionality

**Deliverable:** Full 16-round game playable online

---

### Stage 5: Table Device

**Goal:** Central display for local play

- [ ] Table device role in lobby
- [ ] Position calibration (which physical seat is South)
- [ ] Large trick area display
- [ ] Cards appear from player's direction
- [ ] Player names at screen edges
- [ ] Active player indicator
- [ ] Roem claim sound/animation
- [ ] Cards animate toward winner
- [ ] Statistics panel (scores, tricks, roem)
- [ ] Between-round statistics view
- [ ] Last trick replay

**Deliverable:** Full local play experience with phones + table device

---

### Stage 6: Polish & PWA

**Goal:** Production-ready PWA

- [ ] Install prompt handling
- [ ] Offline rules/help page
- [ ] App icon and splash screens
- [ ] Mobile touch optimization
- [ ] Card animations
- [ ] Loading states
- [ ] Error handling and recovery
- [ ] Accessibility (screen readers, color contrast)
- [ ] Performance optimization

**Deliverable:** Installable, polished PWA

---

## Key Technical Decisions

### Firebase Data Model (Ephemeral)

```typescript
// Realtime Database structure (as implemented)
{
  "lobbies": {
    "[6-digit code]": {
      "code": "string",
      "host": "playerId",
      "createdAt": number,
      "status": "waiting" | "playing" | "finished",
      "players": {
        "[playerId]": {
          "name": "string",
          "seat": 0 | 1 | 2 | 3 | "table",  // 0=Zuid, 1=West, 2=Noord, 3=Oost
          "connected": boolean,
          "lastSeen": number
        }
      },
      "game": GameState | null  // See src/lib/multiplayer/types.ts
    }
  }
}
```

### Card Security

**MVP**: Trust-based (all hands sent to clients, UI only shows player's own hand). Can be cheated via console inspection, but simplest to implement.

**Future**: Firebase Rules to restrict hand access to owner only.

### Design Decisions (Confirmed)

| Decision      | Choice          | Notes                                            |
| ------------- | --------------- | ------------------------------------------------ |
| Card assets   | Open-source SVG | Use svg-cards or similar library                 |
| Roem system   | Manual claim    | Players must spot and announce roem - adds skill |
| Turn timers   | None            | Casual, relaxed play                             |
| Sound effects | Defer           | Can add later if desired                         |

---

## Testing Strategy

### Unit Tests (Vitest)

- All game logic: deck, rules, scoring, roem
- Pure functions, easy to test
- Run on every commit via CI

### Component Tests (Vitest + Testing Library)

- Card rendering
- Hand interaction
- Score display

### E2E Tests (Playwright) ✓

- [x] Lobby flow (create, join, seat selection, start)
- [ ] Full game flow
- [ ] Multiplayer scenarios (multiple browser contexts)
- [ ] Table device mode

---

## AI-Assisted Development Strategy

### Spec-First Development

Before implementing a feature, write/review the relevant spec file in `specs/`. This gives full context for implementation.

### TDD Loop

1. Write failing test
2. Implement to pass
3. Run test (backpressure)
4. Refine until passing

### Incremental Commits

Each completed task = commit. Maintains working state.

### Plan-Driven Work

- `IMPLEMENTATION_PLAN.md` tracks current stage tasks
- Update as tasks complete
- Clear priorities for AI assistance

### Per-Stage Workflow

1. Review stage goals
2. Create detailed implementation plan
3. Write/update relevant spec files
4. Implement with TDD where applicable
5. Deploy and verify
6. Commit checkpoint

---

## Deployment Pipeline

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: build
    uses: actions/deploy-pages@v4
```

Tests must pass before deployment. Auto-deploys on push to main.
