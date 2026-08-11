// Sudoku — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type Board, type Difficulty, isSolved, isComplete, makePuzzle, SIZE,
} from './sudoku'
import { getGame } from '../../registry'

// ── Action & State types ──────────────────────────────────────

export type SudokuAction =
  | { type: 'SELECT'; payload: { r: number; c: number } }
  | { type: 'INPUT'; payload: { r: number; c: number; value: number } }
  | { type: 'NEW_GAME'; payload: { difficulty: Difficulty } }
  | { type: 'ERASE'; payload: { r: number; c: number } }

export interface SudokuStats extends GameStats {
  moves: number
  filled: number   // cells filled in this session
}

// ── Internal state shape ──────────────────────────────────────
//
// The game needs more than the board alone — it also tracks the
// original givens (for "is this a given cell?" checks), the difficulty,
// and the user's selections. We wrap all of this in a single state
// object.

export interface SudokuState {
  puzzle: Board          // original puzzle (with givens)
  board: Board           // current player state
  difficulty: Difficulty
  selected: [number, number] | null
}

export function initialSudoku(difficulty: Difficulty = 'medium'): SudokuState {
  const { puzzle } = makePuzzle(difficulty)
  return {
    puzzle,
    board: puzzle.map(r => r.slice()),
    difficulty,
    selected: null,
  }
}

// ── Givens helper ─────────────────────────────────────────────

function isGiven(state: SudokuState, r: number, c: number): boolean {
  return state.puzzle[r][c] !== 0
}

// ── Pure move logic ───────────────────────────────────────────

export function applySudokuAction(
  state: SudokuState,
  action: SudokuAction,
): GameTransition<SudokuState, SudokuStats> {
  switch (action.type) {
    case 'SELECT': {
      return {
        state: { ...state, selected: [action.payload.r, action.payload.c] },
        consumed: true,
      }
    }
    case 'NEW_GAME': {
      const fresh = initialSudoku(action.payload.difficulty)
      return {
        state: fresh,
        stats: { moves: 1, filled: 0 },  // reset session stats
        consumed: true,
      }
    }
    case 'INPUT': {
      const { r, c, value } = action.payload
      if (isGiven(state, r, c)) {
        return { state, consumed: false }
      }
      if (state.board[r][c] === value) {
        // No change — ignore (don't count as a move).
        return { state, consumed: false }
      }
      const board = state.board.map(row => row.slice())
      board[r][c] = value
      return {
        state: { ...state, board },
        stats: {
          moves: 1,
          filled: value !== 0 ? 1 : 0,
        },
        consumed: true,
      }
    }
    case 'ERASE': {
      const { r, c } = action.payload
      if (isGiven(state, r, c)) {
        return { state, consumed: false }
      }
      if (state.board[r][c] === 0) {
        return { state, consumed: false }
      }
      const board = state.board.map(row => row.slice())
      board[r][c] = 0
      return {
        state: { ...state, board },
        stats: { moves: 1, filled: -1 },
        consumed: true,
      }
    }
  }
}

// ── Win ────────────────────────────────────────────────────────

export function isWinSudoku(state: SudokuState): boolean {
  return isComplete(state.board) && isSolved(state.board)
}

// ── Helpers used by render ───────────────────────────────────

export function sudokuConflicts(state: SudokuState): boolean[][] {
  const result: boolean[][] = []
  const board = state.board
  for (let r = 0; r < SIZE; r++) {
    result.push([])
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c]
      let conflict = false
      if (v === 0) {
        result[r].push(false)
        continue
      }
      // Check row/col/box for another same-value cell
      outer:
      for (let rr = 0; rr < SIZE; rr++) {
        for (let cc = 0; cc < SIZE; cc++) {
          if (rr === r && cc === c) continue
          if (board[rr][cc] !== v) continue
          // Same row
          if (rr === r) { conflict = true; break outer }
          // Same col
          if (cc === c) { conflict = true; break outer }
          // Same box
          if (Math.floor(rr / 3) === Math.floor(r / 3) &&
              Math.floor(cc / 3) === Math.floor(c / 3)) {
            conflict = true; break outer
          }
        }
      }
      result[r].push(conflict)
    }
  }
  return result
}

// ── GameDefinition ─────────────────────────────────────────────

export const sudokuDefinition: GameDefinition<SudokuState, SudokuAction, SudokuStats> = {
  meta: getGame('sudoku')!,
  serializeCompletion: (s) => s.board,

  initialState: () => initialSudoku('medium'),
  applyAction: applySudokuAction,
  isWin: isWinSudoku,

  controls: {
    keyboard: {
      // Static actions (same for any state)
      r: { type: 'NEW_GAME', payload: { difficulty: 'medium' } },
      R: { type: 'NEW_GAME', payload: { difficulty: 'medium' } },
    },
    touch: 'tap',
    // Context-aware keyboard input: digit keys fill the selected
    // cell, arrow keys move the selection, Backspace/Delete erases.
    // Only fires when the engine is interactive (i.e. not in win/loss).
    onKeyDown: (e, { state, dispatch, interactive }) => {
      if (!interactive) return false
      const selected = state.selected
      // Digit keys 1-9 → fill selected cell
      if (e.key >= '1' && e.key <= '9' && selected) {
        if (state.puzzle[selected[0]][selected[1]] === 0) {
          dispatch({
            type: 'INPUT',
            payload: { r: selected[0], c: selected[1], value: Number(e.key) },
          })
          return true
        }
        return false
      }
      // 0 / Backspace / Delete → erase selected cell
      if ((e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') && selected) {
        if (state.puzzle[selected[0]][selected[1]] === 0) {
          dispatch({
            type: 'ERASE',
            payload: { r: selected[0], c: selected[1] },
          })
          return true
        }
        return false
      }
      // Arrow keys → move selection
      if (selected && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const [r, c] = selected
        const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
        const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
        const nr = Math.max(0, Math.min(8, r + dr))
        const nc = Math.max(0, Math.min(8, c + dc))
        if (nr !== r || nc !== c) {
          dispatch({ type: 'SELECT', payload: { r: nr, c: nc } })
          return true
        }
        return false
      }
      // Numpad digits also work
      if (e.code && e.code.startsWith('Numpad') && e.code.length === 7 && selected) {
        const d = Number(e.code.slice(6))
        if (d >= 1 && d <= 9 && state.puzzle[selected[0]][selected[1]] === 0) {
          dispatch({
            type: 'INPUT',
            payload: { r: selected[0], c: selected[1], value: d },
          })
          return true
        }
      }
      return false
    },
  },

  help: {
    description:
      'Fill the 9×9 grid so every row, column, and 3×3 box contains the digits 1-9 exactly once. Click a cell (or use arrow keys) to select it, then type a digit to fill.',
    controls: [
      { action: 'Click a cell to select it' },
      { keys: '↑ ↓ ← →', action: 'move the selection' },
      { keys: '1 2 3 4 5 6 7 8 9', action: 'fill selected cell' },
      { keys: '0 Backspace Delete', action: 'erase selected cell' },
      { keys: 'R', action: 'new puzzle (same difficulty)' },
    ],
    goal: 'Fill every cell so each row, column, and 3×3 box contains 1-9 exactly once.',
  },

  stat: {
    label: 'games.play.givens_count',
    compute: (state) => state.puzzle.flat().filter(v => v !== 0).length,
  },

  render: () => null as any,
}