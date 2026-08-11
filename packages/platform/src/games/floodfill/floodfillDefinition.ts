// Floodfill - GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from "@luca-game/engine"
import {
  type FloodfillState, newGame, floodFill, isSolved, isLoss,
} from "./floodfill"
import { getGame } from "../../registry"

export type FloodAction =
  | { type: "FLOOD"; payload: { color: number } }
  | { type: "RESTART" }

export interface FloodStats extends GameStats {
  moves: number
}

export function initialFlood(): FloodfillState {
  return newGame()
}

export function applyFloodAction(
  state: FloodfillState,
  action: FloodAction,
): GameTransition<FloodfillState, FloodStats> {
  switch (action.type) {
    case "FLOOD": {
      // Always flood from the top-left origin. A no-op (same colour / invalid)
      // must not count as a move.
      const next = floodFill(state, 0, 0, action.payload.color)
      if (next === state) return { state, consumed: false }
      return { state: next, stats: { moves: next.moves } }
    }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const floodfillDefinition: GameDefinition<FloodfillState, FloodAction, FloodStats> = {
  meta: getGame("floodfill")!,
  initialState: initialFlood,
  applyAction: applyFloodAction,
  isWin: isSolved,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "Pick a color to flood the connected region. Fill the whole board in as few moves as possible.",
    controls: [{ action: "Click a color in the palette" }],
    goal: "Make the entire board one color.",
  },
  stat: { label: "games.floodfill.moves", compute: (state) => state.moves },
  render: () => null as any,
}
