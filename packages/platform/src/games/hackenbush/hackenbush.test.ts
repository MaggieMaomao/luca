// Hackenbush — logic tests. Guards the solo-vs-AI Blue-Red rebuild.
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, applyMove, isWin, isLoss } from './hackenbush.ts'

test('generated bush: >=4 edges, balanced colours, positioned, blue first', () => {
  const g = newGame(7)
  ok(g.edges.length >= 4, 'enough edges')
  const b = g.edges.filter(e => e.color === 'blue').length
  const r = g.edges.filter(e => e.color === 'red').length
  ok(Math.abs(b - r) <= 1, `balanced (b=${b} r=${r})`)
  ok(g.nodes.every(n => typeof n.x === 'number' && typeof n.y === 'number'), 'nodes positioned')
  ok(g.nodes.some(n => n.ground), 'has a ground anchor')
  eq(g.turn, 'blue')
})

test('cutting a red edge on blue turn is illegal', () => {
  const g = newGame(7)
  const redIdx = g.edges.findIndex(e => e.color === 'red')
  ok(applyMove(g, redIdx) === g, 'wrong-colour cut rejected')
})

test('a game plays to a decided result (no infinite loop)', () => {
  let s = newGame(7), guard = 0
  while (!isWin(s) && !isLoss(s) && guard++ < 200) {
    const idx = s.edges.findIndex(e => e.color === s.turn)
    if (idx < 0) break
    s = applyMove(s, idx)
  }
  ok(isWin(s) || isLoss(s), 'decided')
})

done()
