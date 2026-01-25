# Klaverjas Online - Development Roadmap

## Project Vision

An online multiplayer Klaverjas card game (Rotterdam rules) as a PWA, deployed on GitHub Pages, with a unique "table device" feature for local play.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | SvelteKit | Small bundles, great reactivity for real-time state, excellent static adapter |
| Language | TypeScript | Type safety for complex game logic |
| Styling | Tailwind CSS v4 | Rapid UI development, mobile-first utilities |
| Real-time | Firebase Realtime Database | Free tier, easy setup, reliable sync |
| Build | Vite (via SvelteKit) | Fast builds, excellent PWA plugins |
| PWA | vite-plugin-pwa | Service workers, manifest, install prompts |
| Testing | Vitest + Playwright | Unit tests for game logic, E2E for flows |
| CI/CD | GitHub Actions | Auto-deploy to GitHub Pages on push |

## Project Structure

```
klaverjas/
├── CLAUDE.md                    # Project constitution for AI assistance
├── IMPLEMENTATION_PLAN.md       # Living prioritized task list (current stage)
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
│   │   │   └── roem.ts
│   │   ├── multiplayer/        # Firebase integration
│   │   ├── components/         # Svelte components
│   │   └── stores/             # Svelte stores for state
│   ├── routes/                 # SvelteKit pages
│   └── app.css                 # Tailwind entry point
├── tests/
│   ├── unit/                   # Vitest unit tests
│   └── e2e/                    # Playwright tests (future)
└── static/                     # PWA assets, card images
```

---

## Development Stages

### Stage 1: Foundation ✓ (In Progress)
**Goal:** Deployable skeleton with CI/CD

- [x] Initialize SvelteKit project with TypeScript
- [x] Configure Tailwind CSS
- [x] Set up Vitest for unit testing
- [x] Configure GitHub Actions for GitHub Pages deployment
- [x] Create CLAUDE.md with project conventions
- [x] Create specs/ directory with initial spec files
- [ ] Set up Firebase project (Realtime Database) - *requires manual setup*
- [ ] Basic PWA manifest and service worker
- [ ] Verify deployment to GitHub Pages

**Deliverable:** Empty app deploys to GitHub Pages automatically

---

### Stage 2: Core Game Logic
**Goal:** Complete, tested Klaverjas rules engine

- [ ] Card and Deck types/utilities
- [ ] Dealing mechanism (8 cards each)
- [ ] Trump suit mechanics (Rotterdam rules)
- [ ] Legal move validation (follow suit, must trump, etc.)
- [ ] Trick winner determination
- [ ] Scoring system (card points + final trick bonus)
- [ ] Roem detection logic (sequences, stuk, four-of-a-kind)
- [ ] Roem claim validation (player claims, system verifies)
- [ ] "Nat" logic (playing team fails)
- [ ] Pit bonus (winning all tricks)
- [ ] Full game flow (16 rounds)

**Approach:** TDD - write tests first, then implementation

**Deliverable:** 100% tested game logic, no UI yet

---

### Stage 3: Single-Device Prototype
**Goal:** Playable game on one device

- [ ] Card component (visual representation)
- [ ] Hand component (fan of cards)
- [ ] Table/trick area component
- [ ] Trump indicator
- [ ] Score display
- [ ] Turn indicator
- [ ] "God mode" - control all 4 hands from one device
- [ ] Complete game flow UI (dealing, trump selection, playing, scoring)

**Deliverable:** Can play full game locally, all hands visible

---

### Stage 4: Multiplayer Foundation
**Goal:** Lobby system and state sync

- [ ] Firebase Realtime Database schema design
- [ ] Lobby creation (generates shareable code)
- [ ] Lobby joining (enter code)
- [ ] Player session management (nickname, seat assignment)
- [ ] Real-time state synchronization
- [ ] Connection status handling
- [ ] Player disconnect/reconnect handling

**Deliverable:** 4 browsers can join same lobby, see each other

---

### Stage 5: Full Multiplayer Game
**Goal:** Complete online play

- [ ] Private hand view (only see your own cards)
- [ ] Turn enforcement (only active player can play)
- [ ] Server-side move validation (prevent cheating)
- [ ] Trump selection phase (multiplayer)
- [ ] Round progression
- [ ] Score tracking across rounds
- [ ] Game completion and final scores
- [ ] Rematch functionality

**Deliverable:** Full 16-round game playable online

---

### Stage 6: Advanced Features
**Goal:** Spectator and Table modes

- [ ] Spectator role in lobby (can see all hands)
- [ ] Table device mode:
  - [ ] Shows played cards (trick area only)
  - [ ] Position-aware (knows which player is where)
  - [ ] Current trick display
  - [ ] Between-round statistics
  - [ ] Last trick replay
- [ ] Visual feedback when cards are played
- [ ] Sound effects (optional)

**Deliverable:** Full local play experience with phones + table device

---

### Stage 7: Polish & PWA
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
// Realtime Database structure
{
  "lobbies": {
    "[lobbyCode]": {
      "host": "playerId",
      "players": {
        "[playerId]": {
          "name": "string",
          "seat": 0-3 | "spectator" | "table",
          "connected": boolean
        }
      },
      "game": {
        "phase": "waiting" | "trump" | "playing" | "scoring",
        "round": 1-16,
        "trump": "hearts" | "diamonds" | "clubs" | "spades",
        "currentTrick": [...],
        "hands": { /* per-player hands */ },
        "scores": { "ns": number, "we": number },
        "currentPlayer": 0-3
      }
    }
  }
}
```

### Card Security

**MVP**: Trust-based (all hands sent to clients, UI only shows player's own hand). Can be cheated via console inspection, but simplest to implement.

**Future**: Firebase Rules to restrict hand access to owner only.

### Design Decisions (Confirmed)

| Decision | Choice | Notes |
|----------|--------|-------|
| Card assets | Open-source SVG | Use svg-cards or similar library |
| Roem system | Manual claim | Players must spot and announce roem - adds skill |
| Turn timers | None | Casual, relaxed play |
| Sound effects | Defer | Can add later if desired |

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

### E2E Tests (Playwright)
- Full game flow
- Multiplayer scenarios (multiple browser contexts)
- Table device mode

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
