// GeomeTree — logic tests. Guards the heap-order tree rebuild.
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, setValue, isSolved } from './geometree.ts'

test('15-node binary tree in heap order', () => {
  const g = newGame()
  eq(g.nodes.length, 15)
  eq(g.nodes[0].children, [1, 2], 'root → 1,2')
  eq(g.nodes[3].children, [7, 8], 'node 3 → 7,8')
})

test('leaves are given, internal nodes start empty', () => {
  const g = newGame()
  const leaves = g.nodes.filter(n => n.children.length === 0)
  eq(leaves.length, 8)
  ok(leaves.every(n => n.prefilled && n.value !== null), 'leaves prefilled')
  ok(g.nodes.filter(n => n.children.length > 0).every(n => n.value === null && !n.prefilled), 'internals empty + editable')
})

test('filling each parent = sum of children solves it', () => {
  let s = newGame()
  for (let i = s.nodes.length - 1; i >= 0; i--) {
    const n = s.nodes[i]
    if (n.children.length === 0) continue
    const sum = n.children.reduce((a, c) => a + (s.nodes[c].value as number), 0)
    s = setValue(s, i, sum)
  }
  ok(isSolved(s), 'bottom-up fill wins')
})

done()
