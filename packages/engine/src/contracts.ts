// @luca-game/engine — contracts (interfaces).
//
// Every game implements the GameDefinition interface.
// The engine never imports from a specific game. Games never import
// from each other. They only implement this contract.
//
// Adding a new game = implement these contracts + register it.
// Nothing else changes.
//
// This engine is framework-coupled (React) but UI-agnostic: it does
// not know about game registries, galleries, or external state.

import type { ReactNode } from 'react'

/** Minimal metadata about a game. Used by the engine for display in
 *  the header / win banner. The platform layer adds its own richer
 *  GameMeta (with icons, descriptions, etc.); the engine only needs
 *  the basics. */
export interface GameMeta {
  /** URL-safe identifier. e.g. "2048", "lights", "sudoku". */
  slug: string
  /** Display title. e.g. "2048". */
  title: string
  /** Single-character icon or short glyph for inline display. */
  icon?: string
}

/** Game-level lifecycle states. Managed by the engine. */
export type GameStatus =
  | 'idle'      // before first move
  | 'playing'   // in progress
  | 'paused'    // user paused (future feature; engine supports it)
  | 'won'       // player completed the puzzle
  | 'lost'      // no more valid moves
  | 'loading'   // generating initial state (heavy puzzles)

/** Valid transitions between GameStatus values. Enforced by the engine. */
export const STATUS_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  idle:     ['playing', 'loading'],
  playing:  ['paused', 'won', 'lost'],
  paused:   ['playing', 'idle'],
  won:      ['playing', 'idle'],   // "keep going" option
  lost:     ['idle'],
  loading:  ['idle', 'playing'],
}

/** A move/action that the player can make. Generic over game-specific
 *  data via the `payload` field. */
export interface GameAction<TPayload = unknown> {
  type: string                  // e.g. "MOVE", "CLICK", "INPUT", "RESTART"
  payload?: TPayload           // game-specific data
  /** Source of the action — useful for analytics / replay. */
  source?: 'keyboard' | 'touch' | 'mouse' | 'programmatic'
}

/** Result of applying an action. The engine reads this to update its
 *  state machine and forward data to the storage adapter. */
export interface GameTransition<TState, TStats = unknown> {
  /** New game state. Engines never mutate; games return new state. */
  state: TState
  /** Updated stats for this move (score gained, moves made, time, etc.)
   *  The engine merges this into the running session stats. */
  stats?: Partial<TStats>
  /** Lifecycle events triggered by this move. The engine decides what
   *  to do with them (e.g. emit to win banner, log, persist). */
  events?: GameEvent[]
  /** Whether the action was consumed. false = ignored (e.g. illegal move). */
  consumed?: boolean
}

/** Game lifecycle events. The engine handles each kind. */
export type GameEvent =
  | { kind: 'MOVE'; payload?: { scoreGained?: number; movesMade?: number } }
  | { kind: 'WIN'; finalState?: unknown }
  | { kind: 'LOSS'; finalState?: unknown }
  | { kind: 'ILLEGAL'; payload?: { reason?: string } }
  | { kind: 'CUSTOM'; payload: unknown }   // game-specific event for engine to surface

/** Statistics tracked per game session + per game lifetime. */
export interface GameStats {
  /** Cumulative score in this session (resets on restart). */
  score: number
  /** Number of moves/inputs in this session. */
  moves: number
  /** Seconds elapsed in this session. */
  elapsed: number
}

/** Persisted high-score record (per browser, per game). */
export interface GameScore {
  /** Best "score" — convention: higher is better. For games like
   *  Lights Out where fewest-moves is best, the game adapter inverts
   *  this when comparing. */
  best: number
  /** Number of times this game has been played. */
  plays: number
  /** ISO timestamp of the last play. */
  lastPlayedAt: string
}

/** What controls each game supports. The engine wires these up
 *  automatically based on the game definition. */
export interface GameControls<TState = unknown, TAction extends GameAction = GameAction> {
  /** Map of keyboard keys to game actions. e.g. { ArrowLeft: { type: 'MOVE', payload: 'left' } }
   *  Modifiers (Ctrl, Shift, Meta) are NOT part of the key — the engine
   *  treats shift+arrow differently from arrow alone.
   *  For context-aware keyboard input (e.g. "type 5 to fill the
   *  currently-selected cell with 5"), use `onKeyDown` below. */
  keyboard: Record<string, GameAction>
  /** Touch gesture support. The engine binds the touch handler when set. */
  touch?: 'swipe' | 'tap' | 'drag' | 'none'
  /** Whether the game supports pause/resume. */
  pausable?: boolean
  /** Optional game-specific keyboard handler. Called by the engine
   *  AFTER the static `keyboard` map is checked, with full access
   *  to the current state. Return `true` to signal the event was
   *  handled (engine will preventDefault). Return `false` (or void)
   *  to let the event bubble. Use this for context-aware input like
   *  "type a digit to fill the currently selected cell". */
  onKeyDown?: (e: KeyboardEvent, ctx: { state: TState; dispatch: (action: TAction) => void; interactive: boolean }) => boolean | void
}

/** Help / how-to-play content. The engine renders this in the help overlay. */
export interface GameHelp {
  /** Short blurb (1-2 sentences). Shown at the top. */
  description: string
  /** Bullet-point control list. Each item is one line of UI text. */
  controls: Array<{ keys?: string; action: string }>
  /** Optional goal text. Shown at the bottom. */
  goal?: string
}

/** The shape every game implements. The engine consumes this; games
 *  produce this. Strict typing: TState, TAction, TStats are per-game. */
export interface GameDefinition<TState, TAction extends GameAction, TStats extends GameStats> {
  /** Display metadata (from the existing registry). */
  meta: GameMeta

  /** Create initial game state. Called when the user clicks "New game". */
  initialState: () => TState

  /** Apply an action to the current state. Pure: returns new state, never mutates. */
  applyAction: (state: TState, action: TAction) => GameTransition<TState, TStats>

  /** Compute win condition. The engine calls this after every action. */
  isWin: (state: TState) => boolean

  /** Compute loss condition. Defaults to false if not implemented. */
  isLoss?: (state: TState) => boolean

  /** Controls (keyboard, touch). Engine wires these automatically. */
  controls: GameControls<TState, TAction>

  /** Help text shown in the overlay. */
  help: GameHelp

  /** Stats config: how the per-session stat is computed from state.
   *  E.g. 2048 uses board-flatten-max, Lights Out uses moves count.
   *  If omitted, defaults to the moves counter. */
  stat?: {
    /** Custom key for the displayed stat. Shown in stats row. */
    label: string
    /** Compute the stat value from the current state. */
    compute: (state: TState, sessionStats: TStats) => number | string
  }

  /** Optional: convert the in-memory state into the canonical JSON shape sent
   *  to the completion API (and consumed by the server-side validator). Use
   *  this when the rich game state differs from what the validator expects —
   *  e.g. 2048 stores tile objects but the validator wants a number grid.
   *  Defaults to the state as-is. */
  serializeCompletion?: (state: TState) => unknown

  /** Render the game board. The engine wraps this with header, stats,
   *  win/loss banners, help overlay. */
  render: (state: TState, ctx: GameRenderContext<TState, TAction, TStats>) => ReactNode
}

/** Context provided to the game's render function. The game uses this
 *  to dispatch actions and access controller state without importing
 *  the engine directly. */
export interface GameRenderContext<TState, TAction extends GameAction, TStats extends GameStats> {
  /** Current game state. Provided so the render fn can use it. */
  state: TState
  /** Dispatch an action to the controller. The controller updates state. */
  dispatch: (action: TAction) => void
  /** Current session stats (cumulative this play session). */
  stats: TStats
  /** Current game lifecycle status (idle / playing / won / etc). */
  status: GameStatus
  /** Whether the game is currently interactive (playing + not paused). */
  interactive: boolean
  /** i18n helper. Already wrapped by the engine so games don't need
   *  to import react-i18next directly. */
  t: (key: string, fallback?: string, vars?: Record<string, unknown>) => string
  /** Persisted score for this game (from storage adapter). */
  persistedScore: GameScore
  /** Start a new game (reset state). */
  restart: () => void
}

/** The GameMeta type is defined above. The platform layer extends it
 *  with additional fields (icons, descriptions, etc.); see
 *  @luca-game/platform for the richer GameMeta. */