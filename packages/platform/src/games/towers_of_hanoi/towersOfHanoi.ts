// Towers of Hanoi — pure game logic.
//
// The classic 1883 Édouard Lucas puzzle. Three pegs (named A, B, C).
// N disks on peg A at the start, ordered smallest (top) to largest
// (bottom). Move one disk at a time — only the top of a peg, and you
// can't place a larger disk on a smaller one. Goal: move all disks
// to peg C, preserving the size order.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

// ── Types ──────────────────────────────────────────────────────

/** A peg is one of the three named positions. */
export type Peg = 'A' | 'B' | 'C'

/** All pegs. */
export const PEGS: readonly Peg[] = ['A', 'B', 'C'] as const

/** Number of disks. 3-8 is playable; 8+ is the original "expert" level. */
export type DiskCount = 3 | 4 | 5 | 6 | 7 | 8

/** A single disk — identified by size (1 = smallest, N = largest). */
export type Disk = number

/** A tower is a stack of disks, ordered top to bottom (smallest first). */
export type Tower = Disk[]

/** The full state: three towers. */
export interface HanoiState {
  /** Number of disks. Set at puzzle start; never changes mid-game. */
  disks: DiskCount
  /** The three towers, keyed by peg name. */
  pegs: Record<Peg, Tower>
  /** Move counter (incremented on each successful move). */
  moves: number
  /** Optional last error from an illegal move attempt. Cleared on
   *  the next legal move. The render layer surfaces this as a flash
   *  message ("Can't place disk 3 on top of disk 1"). */
  error?: string
}

/** A move: take the top disk of `from` and put it on top of `to`. */
export interface HanoiMove {
  from: Peg
  to: Peg
}

// ── Initial state ─────────────────────────────────────────────

/** Build a fresh puzzle. All disks start on peg A, ordered by size. */
export function newPuzzle(disks: number = 3): HanoiState {
  return {
    disks: disks as DiskCount,
    pegs: {
      A: Array.from({ length: disks }, (_, i) => disks - i),  // [N, N-1, ..., 2, 1]
      B: [],
      C: [],
    },
    moves: 0,
  }
}

// ── Validation ────────────────────────────────────────────────

/** Can a disk of size `disk` be placed on top of `tower`?
 *  Smaller-or-equal, but a disk of the same size doesn't really
 *  happen (each size is unique), so the rule is just "size < top
 *  of target tower, OR target is empty". */
export function canPlace(tower: Tower, disk: Disk): boolean {
  if (tower.length === 0) return true
  return disk < tower[tower.length - 1]
}

/** Is the given move legal in the given state? */
export function isLegal(state: HanoiState, move: HanoiMove): boolean {
  if (move.from === move.to) return false
  const fromTower = state.pegs[move.from]
  if (fromTower.length === 0) return false
  const topDisk = fromTower[fromTower.length - 1]
  const toTower = state.pegs[move.to]
  return canPlace(toTower, topDisk)
}

// ── Apply ─────────────────────────────────────────────────────

/** Apply a move to a state. Returns a NEW state. Caller is responsible
 *  for checking legality first (or trusting the returned `error` field). */
export function applyMove(state: HanoiState, move: HanoiMove): HanoiState {
  if (move.from === move.to) {
    return { ...state, error: 'Cannot move to the same peg' }
  }
  const fromTower = state.pegs[move.from]
  if (fromTower.length === 0) {
    return { ...state, error: 'No disk to move' }
  }
  const disk = fromTower[fromTower.length - 1]
  const toTower = state.pegs[move.to]
  if (!canPlace(toTower, disk)) {
    return {
      ...state,
      error: `Cannot place disk ${disk} on top of disk ${toTower[toTower.length - 1]}`,
    }
  }
  // All good — pop from `from`, push to `to`, bump moves.
  return {
    disks: state.disks,
    pegs: {
      A: move.from === 'A' || move.to === 'A'
        ? updateTower(state.pegs.A, move.from === 'A' ? 'pop' : 'push', disk)
        : state.pegs.A,
      B: move.from === 'B' || move.to === 'B'
        ? updateTower(state.pegs.B, move.from === 'B' ? 'pop' : 'push', disk)
        : state.pegs.B,
      C: move.from === 'C' || move.to === 'C'
        ? updateTower(state.pegs.C, move.from === 'C' ? 'pop' : 'push', disk)
        : state.pegs.C,
    },
    moves: state.moves + 1,
    error: undefined,
  }
}

function updateTower(tower: Tower, op: 'pop' | 'push', disk: Disk): Tower {
  if (op === 'pop') {
    return tower.slice(0, -1)
  } else {
    return [...tower, disk]
  }
}

// ── Win / loss ────────────────────────────────────────────────

/** Win: all disks are on peg C, in the right order.
 *  Convention: array index 0 = bottom of tower (largest), so the
 *  final state on C is [N, N-1, ..., 2, 1] for an N-disk puzzle. */
export function isSolved(state: HanoiState): boolean {
  if (state.pegs.A.length !== 0) return false
  if (state.pegs.B.length !== 0) return false
  // Peg C should have all N disks, ordered largest (bottom) to smallest (top).
  if (state.pegs.C.length !== state.disks) return false
  for (let i = 0; i < state.disks; i++) {
    if (state.pegs.C[i] !== state.disks - i) return false
  }
  return true
}

/** Loss: Hanoi has no inherent loss condition — every position is
 *  either won or in-progress. Provided as `false` to satisfy the
 *  engine's `isLoss?` signature. */
export function isLoss(_state: HanoiState): boolean {
  return false
}

// ── Stats helpers ─────────────────────────────────────────────

/** Number of disks on the destination (peg C). Drives the header stat. */
export function disksOnC(state: HanoiState): number {
  return state.pegs.C.length
}

/** Total moves so far. The win-banner stat. */
export function moveCount(state: HanoiState): number {
  return state.moves
}

/** Minimum number of moves required to solve N disks.
 *  Used to show "X / 2^N - 1" progress and to grade the solution. */
export function optimalMoveCount(disks: DiskCount): number {
  return 2 ** disks - 1
}

/** The current state as a fraction of the optimal solution.
 *  Returns 0 if not yet started, 1 if solved. */
export function progress(state: HanoiState): number {
  return disksOnC(state) / state.disks
}

// ── Serialization ─────────────────────────────────────────────

/** Serialize for the server-side completion check.
 *  We don't send the full state (the server can verify a Hanoi solve
 *  by just checking the pegs), but we send the move count and a
 *  fingerprint. */
export interface HanoiSummary {
  disks: DiskCount
  moves: number
  /** Comma-separated peg occupancy, e.g. "5,0,0" or "2,1,2". */
  pegsFingerprint: string
}

export function summarize(state: HanoiState): HanoiSummary {
  return {
    disks: state.disks,
    moves: state.moves,
    pegsFingerprint: `${state.pegs.A.length},${state.pegs.B.length},${state.pegs.C.length}`,
  }
}

/** Re-hydrate from a summary (for "save my progress" features). */
export function fromSummary(summary: HanoiSummary): HanoiState {
  // We don't have the order within each peg from the summary, so
  // we reconstruct the canonical starting state for the right disk
  // count and replay no moves. For a real save feature, the client
  // would also send the full peg arrays.
  const fresh = newPuzzle(summary.disks)
  fresh.moves = summary.moves
  return fresh
}