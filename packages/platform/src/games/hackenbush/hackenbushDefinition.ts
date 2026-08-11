// Hackenbush - GameDefinition for the engine.

import type { GameDefinition, GameStats, GameTransition } from "@luca-game/engine"
import { type HackenbushState, newGame, applyMove, isWin, isLoss, aiMove } from "./hackenbush"
import { getGame } from "../../registry"

export type HackenbushAction = { type: "CUT"; payload: { edge: number } } | { type: "RESTART" }
export interface HackenbushStats extends GameStats { moves: number }

export function initialHB(): HackenbushState { return newGame() }
export function applyHBAction(state: HackenbushState, action: HackenbushAction): GameTransition<HackenbushState, HackenbushStats> {
  switch (action.type) {
    case "CUT": {
      // Player (blue) cuts; turn passes to red.
      let s = applyMove(state, action.payload.edge)
      if (s === state) return { state, consumed: false }
      // AI (red) responds if it can. One edge per turn — no extra moves.
      if (s.turn === "red" && s.edges.some((e) => e.color === "red")) {
        const ai = aiMove(s)
        if (ai != null) s = applyMove(s, ai)
      }
      return { state: s, stats: { moves: s.moves } }
    }
    case "RESTART": return { state: newGame(), consumed: true }
  }
}

export const hackenbushDefinition: GameDefinition<HackenbushState, HackenbushAction, HackenbushStats> = {
  meta: getGame("hackenbush")!,
  initialState: initialHB,
  applyAction: applyHBAction,
  isWin,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "You are Blue. Click a blue edge to cut it; any pieces no longer attached to the ground fall away. The AI (Red) cuts a red edge in reply. Leave the AI with no red edge to cut and you win.",
    controls: [{ action: "Click a blue edge to cut it" }],
    goal: "Make the AI unable to move.",
  },
  stat: { label: "games.hackenbush.moves", compute: (s) => s.moves },
  render: () => null as any,
}
