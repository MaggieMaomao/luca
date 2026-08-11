// Chess — pure game logic (heavily simplified).
//
// Full chess has thousands of rules (castling, en passant, promotion,
// etc). This implementation is a SUBSTANTIAL simplification: just
// the basic piece movement, no special moves, no checkmate detection.
// The "win" is capturing the opponent's king.
//
// Standard 8x8 board, standard starting position. Orientation matches the
// renderer's labels: row 0 = rank 8 (Black's back rank) at the top, row 7 =
// rank 1 (White's back rank) at the bottom; files a..h map to columns 0..7.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type Piece = 'P' | 'R' | 'N' | 'B' | 'Q' | 'K'  // White
                | 'p' | 'r' | 'n' | 'b' | 'q' | 'k'  // Black
export type Square = Piece | '.'
export type ChessState = {
  board: Square[][]
  turn: 'W' | 'B'
  moves: number
}

export const STARTING_BOARD: Square[][] = [
  // Standard 8x8. Row 0 = rank 8 (Black), row 7 = rank 1 (White).
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],  // rank 8 — Black back rank
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],  // rank 7 — Black pawns
  ['.', '.', '.', '.', '.', '.', '.', '.'],  // rank 6
  ['.', '.', '.', '.', '.', '.', '.', '.'],  // rank 5
  ['.', '.', '.', '.', '.', '.', '.', '.'],  // rank 4
  ['.', '.', '.', '.', '.', '.', '.', '.'],  // rank 3
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],  // rank 2 — White pawns
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],  // rank 1 — White back rank
]

export function newGame(): ChessState {
  return {
    board: STARTING_BOARD.map(row => row.slice()),
    turn: 'W',
    moves: 0,
  }
}

function isWhite(p: Square): boolean { return p !== '.' && p === p.toUpperCase() }
function isBlack(p: Square): boolean { return p !== '.' && p === p.toLowerCase() }
function ownPiece(p: Square, turn: 'W' | 'B'): boolean {
  return (turn === 'W' && isWhite(p)) || (turn === 'B' && isBlack(p))
}

function findKing(board: Square[][], color: 'W' | 'B'): [number, number] | null {
  const target = color === 'W' ? 'K' : 'k'
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (board[r][c] === target) return [r, c]
    }
  }
  return null
}

/** Pseudo-legal moves for a piece (doesn't check for self-check). */
export function pieceMoves(state: ChessState, r: number, c: number): Array<[number, number]> {
  const piece = state.board[r][c]
  if (piece === '.') return []
  const turn: 'W' | 'B' = isWhite(piece) ? 'W' : 'B'
  if (ownPiece(piece, state.turn) === false) return []
  const moves: Array<[number, number]> = []
  const dir = (dr: number, dc: number) => {
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i, nc = c + dc * i
      if (nr < 0 || nr >= state.board.length || nc < 0 || nc >= state.board[0].length) break
      const target = state.board[nr][nc]
      if (target === '.') moves.push([nr, nc])
      else {
        if (!ownPiece(target, turn)) moves.push([nr, nc])
        break
      }
    }
  }
  const p = piece.toLowerCase()
  if (p === 'p') {
    // Pawn: forward 1 (or 2 from start), diagonal capture
    const dir_p = turn === 'W' ? -1 : 1
    const nr = r + dir_p
    if (nr >= 0 && nr < state.board.length) {
      if (state.board[nr][c] === '.') {
        moves.push([nr, c])
        // White pawns start on row length-2 (rank 2, bottom); Black on row 1 (rank 7, top).
        const startR = turn === 'W' ? state.board.length - 2 : 1
        if (r === startR) {
          const nr2 = r + 2 * dir_p
          if (state.board[nr2][c] === '.') moves.push([nr2, c])
        }
      }
      for (const dc of [-1, 1]) {
        const nc = c + dc
        if (nc >= 0 && nc < state.board[0].length) {
          const target = state.board[nr][nc]
          if (target !== '.' && !ownPiece(target, turn)) moves.push([nr, nc])
        }
      }
    }
  } else if (p === 'n') {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] as Array<[number, number]>) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < state.board.length && nc >= 0 && nc < state.board[0].length) {
        const target = state.board[nr][nc]
        if (target === '.' || !ownPiece(target, turn)) moves.push([nr, nc])
      }
    }
  } else if (p === 'b' || p === 'q') {
    dir(-1, -1); dir(-1, 1); dir(1, -1); dir(1, 1)
  }
  if (p === 'r' || p === 'q') {
    dir(-1, 0); dir(1, 0); dir(0, -1); dir(0, 1)
  } else if (p === 'k') {
    for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as Array<[number, number]>) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < state.board.length && nc >= 0 && nc < state.board[0].length) {
        const target = state.board[nr][nc]
        if (target === '.' || !ownPiece(target, turn)) moves.push([nr, nc])
      }
    }
  }
  return moves
}

export function applyMove(state: ChessState, from: [number, number], to: [number, number]): ChessState {
  const [fr, fc] = from
  const [tr, tc] = to
  const piece = state.board[fr][fc]
  if (piece === '.') return state
  const moves = pieceMoves(state, fr, fc)
  if (!moves.some(([r, c]) => r === tr && c === tc)) return state
  const board = state.board.map(row => row.slice())
  board[tr][tc] = board[fr][fc]
  board[fr][fc] = '.'
  return {
    ...state,
    board,
    turn: state.turn === 'W' ? 'B' : 'W',
    moves: state.moves + 1,
  }
}

export function isSolved(state: ChessState): boolean {
  // Player wins if they captured the opponent's king on the last move
  const whiteKing = findKing(state.board, 'W')
  const blackKing = findKing(state.board, 'B')
  return whiteKing === null || blackKing === null
}

export function isLoss(_state: ChessState): boolean {
  return false
}

export function newPuzzle(): ChessState {
  return newGame()
}