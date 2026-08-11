// Unknotting — logic tests. Guards the real planar-untangle rebuild.
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, crossingCount, crossingEdges, segmentsCross, moveNode, isSolved } from './unknotting.ts'

const circle = (n: number) => Array.from({ length: n }, (_, k) => {
  const a = (k / n) * 2 * Math.PI
  return { x: 0.5 + 0.3 * Math.cos(a), y: 0.5 + 0.3 * Math.sin(a) }
})

test('newGame is a real puzzle (>=2 crossings, n points)', () => {
  const g = newGame(6, 12345)
  eq(g.n, 6)
  eq(g.points.length, 6)
  ok(crossingCount(g.points) >= 2, 'starts tangled')
})

test('convex loop has zero crossings and is solved', () => {
  const pts = circle(6)
  eq(crossingCount(pts), 0)
  ok(isSolved({ ...newGame(6, 1), points: pts }), 'convex = unknotted')
})

test('a crossing is detected + flagged on both edges', () => {
  const x = circle(6); [x[1], x[3]] = [x[3], x[1]] // swap → figure-eight pinch
  ok(crossingCount(x) >= 1)
  ok(crossingEdges(x).size >= 2, 'both crossing edges flagged')
})

test('segmentsCross: proper crossing vs touching', () => {
  ok(segmentsCross({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 0 }), 'X crosses')
  ok(!segmentsCross({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }), 'disjoint collinear')
})

test('moveNode clamps into the box and counts a move', () => {
  const m = moveNode(newGame(6, 5), 0, 2, -5)
  ok(m.points[0].x <= 0.95 && m.points[0].y >= 0.05, 'clamped')
  eq(m.moves, 1)
})

done()
