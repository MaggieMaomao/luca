// KnotColouring - GameDefinition for the engine.

import type { GameDefinition, GameStats, GameTransition } from "@luca-game/engine"
import { type KnotColoringState, newGame, cycleColor, isSolved, isLoss } from "./knotColouring"
import { getGame } from "../../registry"

export type KnotAction = { type: "CYCLE"; payload: { arc: number } } | { type: "RESTART" }
export interface KnotStats extends GameStats { moves: number }

export function initialKC(): KnotColoringState { return newGame() }
export function applyKCAction(state: KnotColoringState, action: KnotAction): GameTransition<KnotColoringState, KnotStats> {
  switch (action.type) {
    case "CYCLE": {
      const next = cycleColor(state, action.payload.arc)
      if (next === state) return { state, consumed: false }
      return { state: next, stats: { moves: next.moves } }
    }
    case "RESTART": return { state: newGame(), consumed: true }
  }
}

export const knotColouringDefinition: GameDefinition<KnotColoringState, KnotAction, KnotStats> = {
  meta: getGame("knot_colouring")!,
  initialState: initialKC,
  applyAction: applyKCAction,
  isWin: isSolved,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "Click a strand to recolour it. Colour the knot so that at every crossing the three strands are either all the same colour or all different — using at least two colours.",
    controls: [{ action: "Click a strand to cycle its colour" }, { keys: "R", action: "new knot" }],
    goal: "Find a non-trivial 3-colouring (every crossing valid).",
  },
  stat: { label: "games.knot_colouring.moves", compute: (s) => s.moves },
  render: () => null as any,
}
