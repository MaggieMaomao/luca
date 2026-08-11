// Mazes - GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from "@luca-game/engine"
import {
  type MazeState, newGame, move, isSolved, isLoss,
} from "./mazes"
import { getGame } from "../../registry"

export type MazeAction =
  | { type: "MOVE"; payload: { d: number } }
  | { type: "RESTART" }

export interface MazeStats extends GameStats {
  moves: number
}

export function initialMaze(): MazeState {
  return newGame()
}

export function applyMazeAction(
  state: MazeState,
  action: MazeAction,
): GameTransition<MazeState, MazeStats> {
  switch (action.type) {
    case "MOVE":
      return { state: move(state, action.payload.d), stats: { moves: 1 } }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const mazesDefinition: GameDefinition<MazeState, MazeAction, MazeStats> = {
  meta: getGame("mazes")!,
  initialState: initialMaze,
  applyAction: applyMazeAction,
  isWin: isSolved,
  isLoss,
  controls: {
    keyboard: {
      r: { type: "RESTART" },
      R: { type: "RESTART" },
      ArrowUp: { type: "MOVE", payload: { d: 0 } },
      ArrowRight: { type: "MOVE", payload: { d: 1 } },
      ArrowDown: { type: "MOVE", payload: { d: 2 } },
      ArrowLeft: { type: "MOVE", payload: { d: 3 } },
    },
    touch: "tap",
  },
  help: {
    description: "Navigate the maze from S to E using arrow keys or the on-screen buttons.",
    controls: [
      { keys: "Arrows/WASD", action: "move" },
      { keys: "R", action: "restart" },
    ],
    goal: "Reach the end.",
  },
  stat: { label: "games.mazes.moves", compute: (state) => state.moves },
  render: () => null as any,
}
