// Nim — logic tests. Guards the turn/winner + optimal-AI rebuild.
import { test, ok, eq, done } from '../_testkit.ts'
import { newNimGame, applyMove, optimalMove, nimSum, isSolved, isLoss } from './nim.ts'

test('default start is a first-player win (nim-sum != 0)', () => {
  ok(nimSum(newNimGame()) !== 0)
})

test('the move that empties the board records the winner', () => {
  let s = newNimGame([1]) // player to move, one stone
  s = applyMove(s, { pile: 0, count: 1 })
  eq(s.winner, 'player', 'last-stone taker wins (normal play)')
  ok(isSolved(s) && !isLoss(s))
})

test('illegal move is rejected', () => {
  const s = newNimGame()
  ok(applyMove(s, { pile: 0, count: 99 }) === s, 'over-take rejected')
})

test('optimal play from the winning start makes the first player win', () => {
  let s = newNimGame(), guard = 0
  while (s.winner === null && guard++ < 200) {
    const mv = optimalMove(s)
    if (!mv) break
    s = applyMove(s, mv)
  }
  eq(s.winner, 'player', 'first mover wins with perfect play')
})

done()
