// Dots — logic tests. Guards the scoring + extra-turn + win-attribution rebuild.
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, applyMove, opponentMove, isWin, isLoss, isSolved } from './dots.ts'

test('completing a box scores AND keeps the turn', () => {
  let g = newGame(3) // 2x2 boxes
  g = applyMove(g, { type: 'h', r: 0, c: 0 }) // player → opp
  g = applyMove(g, { type: 'h', r: 1, c: 0 }) // opp → player
  g = applyMove(g, { type: 'v', r: 0, c: 0 }) // player → opp
  const before = g.turn
  const total = g.scores[0] + g.scores[1]
  g = applyMove(g, { type: 'v', r: 0, c: 1 }) // completes box (0,0)
  eq(g.scores[0] + g.scores[1], total + 1, 'a box was scored')
  eq(g.turn, before, 'the completer goes again')
})

test('illegal (already-drawn) line is a no-op', () => {
  let g = newGame(3)
  g = applyMove(g, { type: 'h', r: 0, c: 0 })
  ok(applyMove(g, { type: 'h', r: 0, c: 0 }) === g, 'redrawn line rejected')
})

test('a full game terminates with an exclusive win/loss', () => {
  let s = newGame(6), guard = 0
  while (!isSolved(s) && !isLoss(s) && guard++ < 10000) {
    const mv = opponentMove(s, 99 + guard)
    if (!mv) break
    s = applyMove(s, mv)
  }
  ok(isWin(s) || isLoss(s), 'decided')
  ok(!(isWin(s) && isLoss(s)), 'not both')
})

done()
