# Contributing to Luca

Thanks for your interest in Luca! This is a small, MIT-licensed game platform —
a generic engine plus a curated collection of browser games. Contributions of
new games, engine improvements, docs, and bug fixes are all welcome.

## Project layout

Luca is an npm-workspaces monorepo:

```
packages/engine     @luca-game/engine   — the game engines (turn-based + action/3D)
packages/platform   @luca-game/platform — the games collection, gallery, play wrapper
docs/                                    — architecture, game contract, gesture algorithm, …
app/                                     — optional Capacitor native shell
```

## Getting started

```bash
git clone https://github.com/MaggieMaomao/luca.git
cd luca
npm install          # installs all workspaces
npm run build        # builds engine, then platform
npm test             # runs every game's logic tests (node --experimental-strip-types)
npm run lint         # type-checks all packages
```

Node **>= 18** is required.

## Adding a game

Each game lives in `packages/platform/src/games/<slug>/`. See an existing game
(e.g. `sudoku/` for a turn-based puzzle, `toss/` for an action game) and
`docs/GAME_DEFINITION.md`. In short you provide:

1. Pure game **logic** in `<slug>.ts` with a matching `<slug>.test.ts`
   (a standalone test that prints `RESULT: X passed, Y failed`).
2. A **React component** that renders the game.
3. A per-game `index.ts` and an entry in `src/registry.ts` + `src/games/index.ts`
   + `src/PlayPage.tsx`.

Turn-based games optionally add a server-side completion validator (Python port,
see `docs/COMPLETION_API.md`); action/skill games can trust the client score.

## Conventions

- **TypeScript**, strict mode. Non-test source uses extensionless relative
  imports; `*.test.ts` uses explicit `.ts` extensions (run under Node's type
  stripping).
- Keep game logic **pure and testable** — no DOM/React in `<slug>.ts`.
- Every game ships a `*.test.ts`; `npm test` must stay green.

## Pull requests

1. Fork and branch from `main`.
2. `npm run build && npm test && npm run lint` must pass.
3. Keep PRs focused; describe what and why.
4. By contributing you agree your work is licensed under the project's
   [MIT License](./LICENSE).

## Code of conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Be kind.
