// Knot Colouring — logic tests. Guards the real Fox-tricolouring rebuild.
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, setColor, cycleColor, crossingValid, isSolved } from './knotColouring.ts'

test('trefoil: 3 arcs, 3 crossings, 3 colours', () => {
  const g = newGame()
  eq(g.arcs, 3)
  eq(g.crossings.length, 3)
  eq(g.numColors, 3)
})

test('all-same is valid-but-trivial → NOT solved', () => {
  let s = newGame()
  for (let a = 0; a < 3; a++) s = setColor(s, a, 0)
  ok(!isSolved(s), 'trivial colouring rejected')
})

test('all-different → solved (non-trivial tricolouring)', () => {
  let s = newGame()
  s = setColor(s, 0, 0); s = setColor(s, 1, 1); s = setColor(s, 2, 2)
  ok(isSolved(s))
  ok(s.crossings.every(x => crossingValid(s, x)), 'every crossing valid')
})

test('two-same-one-different is invalid', () => {
  let s = newGame()
  s = setColor(s, 0, 0); s = setColor(s, 1, 0); s = setColor(s, 2, 1)
  ok(!isSolved(s))
})

test('cycleColor wraps 0→1→2→0', () => {
  let s = newGame()
  for (let k = 0; k < 4; k++) s = cycleColor(s, 0)
  eq(s.coloring[0], 0)
})

done()
