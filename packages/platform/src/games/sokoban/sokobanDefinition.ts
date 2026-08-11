// Sokoban - GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from "@luca-game/engine"
import {
  type SokobanState, newGame, move, isSolved, isLoss,
} from "./sokoban"
import { getGame } from "../../registry"

export type SokobanAction =
  | { type: "MOVE"; payload: { dr: number; dc: number } }
  | { type: "RESTART" }

export interface SokobanStats extends GameStats {
  moves: number
}

export function initialSokoban(): SokobanState {
  return newGame()
}

export function applySokobanAction(
  state: SokobanState,
  action: SokobanAction,
): GameTransition<SokobanState, SokobanStats> {
  switch (action.type) {
    case "MOVE":
      return { state: move(state, action.payload.dr, action.payload.dc), stats: { moves: 1 } }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const sokobanDefinition: GameDefinition<SokobanState, SokobanAction, SokobanStats> = {
  meta: getGame("sokoban")!,
  initialState: initialSokoban,
  applyAction: applySokobanAction,
  isWin: isSolved,
  isLoss,
  controls: {
    keyboard: {
      r: { type: "RESTART" }, R: { type: "RESTART" },
      ArrowUp: { type: "MOVE", payload: { dr: -1, dc: 0 } },
      ArrowRight: { type: "MOVE", payload: { dr: 0, dc: 1 } },
      ArrowDown: { type: "MOVE", payload: { dr: 1, dc: 0 } },
      ArrowLeft: { type: "MOVE", payload: { dr: 0, dc: -1 } },
    },
    touch: "tap",
  },
  help: {
    description: "Push boxes onto target squares. Use arrow keys or on-screen buttons.",
    controls: [
      { keys: "Arrows/WASD", action: "move" },
      { keys: "R", action: "restart" },
    ],
    goal: "Push every box onto a target.",
  },
  stat: { label: "games.sokoban.moves", compute: (state) => state.moves },
  render: () => null as any,
}
