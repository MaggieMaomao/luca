# @luca-game/cli (`luca`)

Luca dev CLI — validate a game, list games, print the `Game` contract. Also
wrapped by [`@luca-game/mcp`](../mcp) for AI agents.

```bash
luca validate <slug> [--json]   # files present, registered in 3 places, logic pure, test passes
luca list [--json]              # all registered game slugs
luca contract                   # the action-engine Game<State,Intent,Ev> contract source
```

`validate` returns **fix-oriented** results — each failing check says exactly
what to do — so it drives the generate → validate → fix loop for humans and
agents alike. `--json` emits machine-readable output.

```bash
$ luca validate toss
luca validate toss — ✅ PASS
  ✓ dir — packages/platform/src/games/toss/ exists
  ✓ file:toss.ts — toss.ts present
  ...
  ✓ test — test: 9 passed, 0 failed
```

MIT © MaggieMaomao
