// Chomp - GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from "@luca-game/engine"
import {
  type ChompState, newGame, applyMove, isLegal, isSolved, isLoss,
} from "./chomp"
import { getGame } from "../../registry"

export type ChompAction =
  | { type: "CHOMP"; payload: { r: number; c: number } }
  | { type: "RESTART" }

export interface ChompStats extends GameStats {
  moves: number
}

export function initialChomp(): ChompState {
  return newGame()
}

export function applyChompAction(
  state: ChompState,
  action: ChompAction,
): GameTransition<ChompState, ChompStats> {
  switch (action.type) {
    case "CHOMP":
      if (!isLegal(state, action.payload.r, action.payload.c)) {
        return { state, consumed: false }
      }
      return { state: applyMove(state, action.payload.r, action.payload.c), stats: { moves: 1 } }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const chompDefinition: GameDefinition<ChompState, ChompAction, ChompStats> = {
  meta: getGame("chomp")!,
  initialState: initialChomp,
  applyAction: applyChompAction,
  isWin: isSolved,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "Click a cell to eat it and everything above/right. The bottom-left (red) is poison.",
    controls: [{ action: "Click any uneaten cell" }],
    goal: "Force your opponent to eat the poison.",
  },
  stat: { label: "games.chomp.remaining", compute: (state) => state.grid.flat().filter(c => c).length },
  render: () => null as any,
}
