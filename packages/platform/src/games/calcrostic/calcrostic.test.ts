// Calcrostic — logic tests. Guards the solvable cross-sum rebuild.
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, setCell, isSolved } from './calcrostic.ts'

test('puzzle has both givens and blanks', () => {
  const g = newGame(4, 99)
  let givens = 0, blanks = 0
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) (g.given[r][c] ? givens++ : blanks++)
  ok(givens > 0 && blanks > 0, `givens=${givens} blanks=${blanks}`)
})

test('given clue cells are locked', () => {
  const g = newGame(4, 99)
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (g.given[r][c]) { ok(setCell(g, r, c, 1) === g, 'given cell rejects edit'); return }
  }
})

test('puzzle is solvable (brute-force fills the blanks)', () => {
  const g = newGame(4, 99)
  const blanks: Array<[number, number]> = []
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!g.given[r][c]) blanks.push([r, c])
  let solved = false
  const tryFill = (i: number, s: typeof g): void => {
    if (solved) return
    if (i === blanks.length) { if (isSolved(s)) solved = true; return }
    for (let v = 1; v <= 4; v++) {
      tryFill(i + 1, setCell(s, blanks[i][0], blanks[i][1], v))
      if (solved) return
    }
  }
  tryFill(0, g)
  ok(solved, 'a winning fill exists')
})

done()
