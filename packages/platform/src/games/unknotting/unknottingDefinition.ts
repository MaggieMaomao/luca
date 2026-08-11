// Unknotting - GameDefinition for the engine.

import type { GameDefinition, GameStats, GameTransition } from "@luca-game/engine"
import { type UnknottingState, newGame, moveNode, crossingCount, isSolved, isLoss } from "./unknotting"
import { getGame } from "../../registry"

export type UnknottingAction =
  | { type: "MOVE"; payload: { id: number; x: number; y: number } }
  | { type: "RESTART" }

export interface UnknottingStats extends GameStats {
  moves: number
}

export function initialUK(): UnknottingState {
  return newGame()
}

export function applyUKAction(
  state: UnknottingState,
  action: UnknottingAction,
): GameTransition<UnknottingState, UnknottingStats> {
  switch (action.type) {
    case "MOVE": {
      const next = moveNode(state, action.payload.id, action.payload.x, action.payload.y)
      // No-op if nothing changed (e.g. invalid id) — don't count it as a move.
      if (next === state) return { state, consumed: false }
      return { state: next, stats: { moves: next.moves } }
    }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const unknottingDefinition: GameDefinition<UnknottingState, UnknottingAction, UnknottingStats> = {
  meta: getGame("unknotting")!,
  initialState: initialUK,
  applyAction: applyUKAction,
  isWin: isSolved,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "drag" },
  help: {
    description: "Drag the points so the loop crosses itself nowhere — turn the tangled knot into a simple loop (the unknot).",
    controls: [
      { action: "Drag a point to move that part of the rope" },
      { keys: "R", action: "New tangle" },
    ],
    goal: "Reduce the crossings to 0.",
  },
  stat: { label: "games.unknotting.crossings", compute: (s) => crossingCount(s.points) },
  render: () => null as never,
}
