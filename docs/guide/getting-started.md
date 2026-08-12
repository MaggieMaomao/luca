# What is Luca?

Luca is a small, MIT-licensed **game platform** for the browser: a generic
engine for running games, plus a curated collection that uses it. It powers
[CatoBigato](https://www.catobigato.com)'s game section but is designed to be
consumed by any web app.

It's an npm-workspaces monorepo:

| Package | What it is |
|---|---|
| [`@luca-game/engine`](https://github.com/MaggieMaomao/luca/tree/main/packages/engine) | The engines: a **turn-based** React state machine (puzzles) and a renderer-agnostic **action/3D** engine (`@luca-game/engine/action`). |
| [`@luca-game/platform`](https://github.com/MaggieMaomao/luca/tree/main/packages/platform) | The **games collection** — registry, gallery UI, play wrapper, and the completion/resolve API contract. |

## Run it locally

Node **≥ 18** is required.

```bash
git clone https://github.com/MaggieMaomao/luca.git
cd luca
npm install
npm run build        # builds engine, then platform
npm test             # runs every game's logic test
```

## The 5-minute path

1. **Scaffold a game** — one command generates a working game + a passing test:

   ```bash
   npx create-luca-game star_catch
   ```

2. **Register it** — the CLI prints three edits (`registry.ts`, `games/index.ts`,
   `PlayPage.tsx`). Make them and the game appears in the gallery.

3. **Verify** — `npm test` stays green (the scaffold ships a passing test); type
   with `npm run lint`.

4. **Make it yours** — replace the generated logic in `star_catch.ts` with your
   game. See [Build your first game](/guide/your-first-game) for the walk-through
   and [Concepts](/guide/concepts) for how the pieces fit.

## Next steps

- [Concepts](/guide/concepts) — the two engines and the `Game` contract.
- [Build your first game](/guide/your-first-game) — a hands-on tutorial.
- [Game definition](/GAME_DEFINITION) — the full contract reference.
- **Building with an AI agent?** See [`AGENTS.md`](https://github.com/MaggieMaomao/luca/blob/main/AGENTS.md)
  and the MCP server.
