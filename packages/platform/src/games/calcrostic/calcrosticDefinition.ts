// Calcrostic - GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from "@luca-game/engine"
import {
  type CalcrosticState, newGame, setCell, isSolved, isLoss,
} from "./calcrostic"
import { getGame } from "../../registry"

export type CalcrosticAction =
  | { type: "SET"; payload: { r: number; c: number; value: number } }
  | { type: "RESTART" }

export interface CalcrosticStats extends GameStats {
  moves: number
}

export function initialCalcrostic(): CalcrosticState {
  return newGame()
}

export function applyCalcrosticAction(
  state: CalcrosticState,
  action: CalcrosticAction,
): GameTransition<CalcrosticState, CalcrosticStats> {
  switch (action.type) {
    case "SET":
      return { state: setCell(state, action.payload.r, action.payload.c, action.payload.value), stats: { moves: 1 } }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const calcrosticDefinition: GameDefinition<CalcrosticState, CalcrosticAction, CalcrosticStats> = {
  meta: getGame("calcrostic")!,
  initialState: initialCalcrostic,
  applyAction: applyCalcrosticAction,
  isWin: isSolved,
  isLoss: () => false,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "Fill the grid so each row and column sums to its clue.",
    controls: [{ action: "Click a cell, then a number" }],
    goal: "Match all row/column sums.",
  },
  stat: { label: "games.calcrostic.filled", compute: (state) => state.grid.flat().filter(v => v !== 0).length },
  render: () => null as any,
}
