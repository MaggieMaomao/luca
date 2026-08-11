// GeomeTree - GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from "@luca-game/engine"
import {
  type GeomeTreeState, newGame, setValue, isSolved, isLoss,
} from "./geometree"
import { getGame } from "../../registry"

export type GeomeAction =
  | { type: "SET"; payload: { idx: number; value: number } }
  | { type: "RESTART" }

export interface GeomeStats extends GameStats {
  moves: number
}

export function initialGeome(): GeomeTreeState {
  return newGame()
}

export function applyGeomeAction(
  state: GeomeTreeState,
  action: GeomeAction,
): GameTransition<GeomeTreeState, GeomeStats> {
  switch (action.type) {
    case "SET":
      return { state: setValue(state, action.payload.idx, action.payload.value), stats: { moves: 1 } }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const geometreeDefinition: GameDefinition<GeomeTreeState, GeomeAction, GeomeStats> = {
  meta: getGame("geometree")!,
  initialState: initialGeome,
  applyAction: applyGeomeAction,
  isWin: isSolved,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "Fill in the tree so each parent equals the sum (or product) of its children.",
    controls: [{ action: "Click a node, then a number" }],
    goal: "Make every parent equal its children's relation.",
  },
  stat: { label: "games.geometree.filled", compute: (state) => state.nodes.filter(n => n.value !== null).length },
  render: () => null as any,
}
