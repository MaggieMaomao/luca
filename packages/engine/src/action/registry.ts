// Engine — game registry (the platform seam).
//
// Games register themselves here; the app (or a future user-facing gallery)
// lists + loads them by id. Keeping this in the engine means any consumer gets
// discovery for free.

import type { AnyGame } from './game'

const games = new Map<string, AnyGame>()

export function registerGame(game: AnyGame): void {
  games.set(game.meta.id, game)
}

export function getGame(id: string): AnyGame | undefined {
  return games.get(id)
}

export function listGames(): AnyGame[] {
  return [...games.values()]
}
