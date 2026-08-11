// Packing - GameDefinition for the engine.

import type { GameDefinition, GameStats, GameTransition } from "@luca-game/engine"
import { type PackingState, newPuzzle, place, unplace, isSolved, isLoss, placedCount } from "./packing"
import { getGame } from "../../registry"

export type PackingAction =
  | { type: "PLACE"; payload: { id: number; x: number; y: number } }
  | { type: "UNPLACE"; payload: { id: number } }
  | { type: "RESTART" }

export interface PackingStats extends GameStats { moves: number }

export function initialPK(): PackingState { return newPuzzle() }

export function applyPKAction(state: PackingState, action: PackingAction): GameTransition<PackingState, PackingStats> {
  switch (action.type) {
    case "PLACE": {
      const next = place(state, action.payload.id, action.payload.x, action.payload.y)
      if (next === state) return { state, consumed: false }
      return { state: next, stats: { moves: next.moves } }
    }
    case "UNPLACE": {
      const next = unplace(state, action.payload.id)
      if (next === state) return { state, consumed: false }
      return { state: next, stats: { moves: next.moves } }
    }
    case "RESTART":
      return { state: newPuzzle(), consumed: true }
  }
}

export const packingDefinition: GameDefinition<PackingState, PackingAction, PackingStats> = {
  meta: getGame("packing")!,
  initialState: initialPK,
  applyAction: applyPKAction,
  isWin: isSolved,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "Fit every rectangle into the square container with no gaps or overlaps. Pick a piece from the tray, then click a cell to drop its top-left corner there. Click a placed piece to take it back.",
    controls: [
      { action: "Click a tray piece, then a grid cell to place it" },
      { action: "Click a placed piece to return it to the tray" },
      { keys: "R", action: "new puzzle" },
    ],
    goal: "Place all pieces — they exactly tile the container.",
  },
  stat: { label: "games.packing.placed", compute: (s) => placedCount(s) },
  render: () => null as never,
}
