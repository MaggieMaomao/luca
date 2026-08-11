// Fruit Salad - GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from "@luca-game/engine"
import {
  type FruitSaladState, newGame, setGuess, isSolved, isLoss,
} from "./fruitSalad"
import { getGame } from "../../registry"

export type FruitSaladAction =
  | { type: "SET"; payload: { bowl: number; fruit: number; count: number } }
  | { type: "RESTART" }

export interface FruitSaladStats extends GameStats {
  moves: number
}

export function initialFruitSalad(): FruitSaladState {
  return newGame()
}

export function applyFruitSaladAction(
  state: FruitSaladState,
  action: FruitSaladAction,
): GameTransition<FruitSaladState, FruitSaladStats> {
  switch (action.type) {
    case "SET":
      return {
        state: setGuess(state, action.payload.bowl, action.payload.fruit, action.payload.count),
        stats: { moves: 1 },
      }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const fruitSaladDefinition: GameDefinition<FruitSaladState, FruitSaladAction, FruitSaladStats> = {
  meta: getGame("fruit_salad")!,
  initialState: initialFruitSalad,
  applyAction: applyFruitSaladAction,
  isWin: isSolved,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "Set the count of each fruit in each bowl so the totals match.",
    controls: [{ action: "Pick a bowl header, then a fruit, then a number" }],
    goal: "All bowls match their known totals.",
  },
  stat: {
    label: "games.fruit_salad.filled",
    compute: (state) => state.guess.flat().filter(v => v > 0).length,
  },
  render: () => null as any,
}
