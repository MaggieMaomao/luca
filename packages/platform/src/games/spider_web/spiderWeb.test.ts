// Spider Web — logic tests. Guards the reachability fix (fly could be stuck).
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, reachable, move, isSolved } from './spiderWeb.ts'

test('across many seeds: fly/spider never stuck, fly always reachable', () => {
  let allOk = true
  for (let seed = 1; seed <= 40; seed++) {
    const g = newGame(seed)
    if (g.stuck.includes(g.fly) || g.stuck.includes(g.spider)) allOk = false
    if (!reachable(g.adj, g.stuck, g.spider, g.fly)) allOk = false
  }
  ok(allOk, 'every puzzle is solvable')
})

test('moving follows an edge to a non-stuck node', () => {
  const g = newGame(7)
  const nbr = g.adj[g.spider].find(n => !g.stuck.includes(n))
  ok(typeof nbr === 'number', 'a legal neighbour exists')
  eq(move(g, nbr as number).spider, nbr, 'spider moved there')
})

test('solved exactly when the spider is on the fly', () => {
  const g = newGame(7)
  ok(!isSolved(g), 'not solved at the centre')
  ok(isSolved({ ...g, spider: g.fly }), 'solved when spider == fly')
})

done()
