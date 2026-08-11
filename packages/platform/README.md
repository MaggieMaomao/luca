# @luca-game/platform

A curated collection of 28 games (3 playable today, 25 coming-soon) built on top of [`@luca-game/engine`](../engine). Ships with a gallery UI, a per-game registry, and a standard completion/resolve-steps API contract for server-side validation.

## What you get

- A **gallery** component (`<Gallery>`) for browsing the games collection
- A **play page** wrapper (`<PlayPage>`) that mounts the right game
- A **game registry** (`GAMES` constant) listing all 28 games
- A **completion API contract** — `CompletionClient` interface + `LocalCompletionClient` default + `HttpCompletionClient` example
- Per-game subpath imports: `import games2048 from '@luca-game/platform/games/games2048'`

## What it does NOT do

- It does not run a server. The `CompletionClient` is an interface; the HTTP endpoint is the consumer's responsibility.
- It does not handle auth. Consumers inject the actor_id via `getActorId` on `HttpCompletionClient`.
- It does not include a backend. CatoBigato ships one, but you can implement the server in any language.

## Install

```bash
npm install @luca-game/platform
```

## Usage

```tsx
import { Gallery, PlayPage, CompletionProvider, HttpCompletionClient } from '@luca-game/platform'

const client = new HttpCompletionClient({ getActorId: () => currentUser?.id })

function App() {
  return (
    <CompletionProvider client={client}>
      <Gallery />
    </CompletionProvider>
  )
}
```

## Embedding a single game

```tsx
import games2048 from '@luca-game/platform/games/games2048'
import { HttpCompletionClient } from '@luca-game/platform'

function MyEmbed() {
  return <games2048.Component />
}
```

## License

MIT — see [LICENSE](./LICENSE).

Part of the [luca monorepo](https://github.com/MaggieMaomao/luca).