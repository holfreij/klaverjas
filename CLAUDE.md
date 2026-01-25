# Klaverjas Online

An online multiplayer Klaverjas card game (Rotterdam rules) as a PWA, deployed on GitHub Pages.

## Key Documents

- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Current tasks and progress
- **[plans/roadmap.md](plans/roadmap.md)** - Full development roadmap and strategy
- **[specs/](specs/)** - Detailed requirements:
  - [game-rules.md](specs/game-rules.md) - Rotterdam Klaverjas rules
  - [multiplayer.md](specs/multiplayer.md) - Lobby and sync requirements
  - [ui-components.md](specs/ui-components.md) - UI component specs
  - [table-device.md](specs/table-device.md) - Table device mode

## Quick Reference

| Technology | Purpose |
|------------|---------|
| SvelteKit | Framework (static adapter for GitHub Pages) |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling (via @tailwindcss/vite) |
| Firebase Realtime Database | Multiplayer sync |
| Vitest | Unit testing |
| Playwright | E2E testing (future) |

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build locally
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run check        # TypeScript/Svelte type checking
```

## Project Structure

```
src/
├── lib/
│   ├── game/           # Pure TypeScript game logic (no Svelte dependencies)
│   │   ├── deck.ts     # Card types, deck creation, shuffling
│   │   ├── rules.ts    # Legal moves, trick winner, Rotterdam rules
│   │   ├── scoring.ts  # Point calculation, nat, pit
│   │   └── roem.ts     # Bonus combinations detection
│   ├── multiplayer/    # Firebase integration
│   ├── components/     # Svelte components
│   └── stores/         # Svelte stores for state management
├── routes/             # SvelteKit pages
└── app.css             # Tailwind entry point

specs/                  # Requirements documents
tests/
├── unit/              # Vitest unit tests
└── e2e/               # Playwright tests (future)
```

## Architecture Decisions

1. **Game logic is pure TypeScript** - No Svelte/framework dependencies in `src/lib/game/`. This makes it easy to test and reason about.

2. **Rotterdam rules** - Not Amsterdam. Key difference: must always trump if unable to follow suit (no partner exception).

3. **Manual roem claiming** - Players must spot and announce roem (bonus combinations). Auto-detection validates claims.

4. **State flow**: Firebase → Svelte stores → Components

5. **Trust-based security for MVP** - All hands sent to clients, UI only shows player's own hand. Can add Firebase Rules later if needed.

## Code Conventions

- Use Svelte 5 runes (`$state`, `$derived`, `$effect`) instead of legacy stores where possible
- All game logic functions must have corresponding unit tests
- Components use PascalCase (`Card.svelte`), utilities use camelCase (`createDeck.ts`)
- Prefer explicit types over inference for public APIs
- Keep components small and focused

## Game Rules Summary (Rotterdam)

- 4 players, 2 teams (North-South vs West-East)
- 32 cards (7-A in 4 suits), 8 cards per player
- Trump suit chosen by first player (or pass around)
- Must follow suit; if unable, must trump (Rotterdam: no partner exception)
- 16 rounds per game, playing team must get majority or goes "nat"
- Roem (bonus points): sequences (3+ cards), stuk (K+Q of trump), four-of-a-kind

## Card Values

**Non-trump**: A=11, 10=10, K=4, Q=3, J=2, 9/8/7=0
**Trump**: J=20, 9=14, A=11, 10=10, K=4, Q=3, 8/7=0

## Testing Guidelines

- Write tests before implementation (TDD) for game logic
- Test edge cases: empty hands, all passes, nat scenarios, pit
- Use descriptive test names: `it('should reject playing hearts when player has spades and spades were led')`
