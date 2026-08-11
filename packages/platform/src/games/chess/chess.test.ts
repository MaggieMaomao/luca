// Chess — logic tests. Guards the 8x8-board + pawn-start-row rebuild.
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, pieceMoves, applyMove, isSolved, STARTING_BOARD } from './chess.ts'

test('board is standard 8x8', () => {
  const s = newGame()
  eq(s.board.length, 8, 'rows')
  ok(s.board.every(r => r.length === 8), 'cols')
  eq(STARTING_BOARD.length, 8)
})

test('standard starting position (Black top, White bottom)', () => {
  const s = newGame()
  eq(s.board[0].join(''), 'rnbqkbnr', 'rank8 black back rank')
  eq(s.board[1].join(''), 'pppppppp', 'rank7 black pawns')
  eq(s.board[6].join(''), 'PPPPPPPP', 'rank2 white pawns')
  eq(s.board[7].join(''), 'RNBQKBNR', 'rank1 white back rank')
})

test('white pawn double-move from its start row', () => {
  const s = newGame() // white to move
  const m = pieceMoves(s, 6, 4).map(x => x.join(',')).sort()
  eq(m, ['4,4', '5,4'], 'e2 → e3/e4')
})

test('white knight opening moves', () => {
  const m = pieceMoves(newGame(), 7, 1).map(x => x.join(',')).sort()
  eq(m, ['5,0', '5,2'], 'b1 → a3/c3')
})

test('cannot move opponent piece on your turn', () => {
  eq(pieceMoves(newGame(), 0, 1), [], 'black knight inert on white turn')
})

test('capturing the king wins', () => {
  // Minimal: white pawn at (1,1) can capture black king placed at (0,0)... set up.
  const s = newGame()
  const board = s.board.map(r => r.slice())
  for (const row of board) row.fill('.')
  board[7][4] = 'K'; board[1][1] = 'P'; board[0][0] = 'k'
  const st = { ...s, board, turn: 'W' as const }
  const after = applyMove(st, [1, 1], [0, 0]) // diagonal capture of the king
  ok(isSolved(after), 'black king captured → solved/win')
})

done()
