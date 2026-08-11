// Sliding Blocks — unit tests.
//
// Run with: node --experimental-strip-types src/games/sliding_blocks/slidingBlocks.test.ts

import {
  newSolvedBoard, shuffleBoard, applyMove, isSolved, isLoss,
  correctTiles, manhattanDistance, toRows, fromRows,
  inBounds, isAdjacent, idxToRc, rcToIdx,
  type Board, type SlidingMove,
} from './slidingBlocks.ts'

// ── Test framework ────────────────────────────────────────────

let pass = 0
let fail = 0
const failures: Array<[string, string]> = []

function test(name: string, fn: () => void) {
  try {
    fn()
    pass++
    console.log(`  PASS  ${name}`)
  } catch (e) {
    fail++
    const msg = e instanceof Error ? e.message : String(e)
    failures.push([name, msg])
    console.log(`  FAIL  ${name}: ${msg}`)
  }
}

function assertEqual<T>(actual: T, expected: T, label?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label || 'values differ'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertTrue(cond: boolean, label = 'should be true') {
  if (!cond) throw new Error(label)
}

// ── Index helpers ─────────────────────────────────────────────

console.log('\n=== index helpers ===')
test('rcToIdx / idxToRc round-trip', () => {
  for (const size of [3, 4, 5] as const) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = rcToIdx(r, c, size)
        const [rr, cc] = idxToRc(idx, size)
        assertEqual([rr, cc], [r, c], `round-trip for (${r},${c}) at size ${size}`)
      }
    }
  }
})

test('inBounds', () => {
  assertTrue(inBounds(0, 0, 3))
  assertTrue(inBounds(2, 2, 3))
  assertTrue(!inBounds(-1, 0, 3))
  assertTrue(!inBounds(0, 3, 3))
  assertTrue(!inBounds(3, 3, 3))
})

test('isAdjacent', () => {
  assertTrue(isAdjacent(rcToIdx(1, 1, 3), rcToIdx(1, 2, 3), 3))   // right
  assertTrue(isAdjacent(rcToIdx(1, 1, 3), rcToIdx(2, 1, 3), 3))   // down
  assertTrue(!isAdjacent(rcToIdx(1, 1, 3), rcToIdx(2, 2, 3), 3))  // diagonal
  assertTrue(!isAdjacent(rcToIdx(1, 1, 3), rcToIdx(0, 0, 3), 3))  // far
})

// ── newSolvedBoard ────────────────────────────────────────────

console.log('\n=== newSolvedBoard ===')
test('3x3 solved board', () => {
  const b = newSolvedBoard(3)
  assertEqual(b.size, 3)
  assertEqual(b.cells, [1, 2, 3, 4, 5, 6, 7, 8, 0])
  assertEqual(b.emptyIdx, 8)
  assertEqual(b.moves, 0)
})

test('4x4 solved board', () => {
  const b = newSolvedBoard(4)
  assertEqual(b.cells, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0])
  assertEqual(b.emptyIdx, 15)
})

test('5x5 solved board', () => {
  const b = newSolvedBoard(5)
  assertEqual(b.cells.length, 25)
  assertEqual(b.cells[24], 0)
})

// ── isSolved ──────────────────────────────────────────────────

console.log('\n=== isSolved ===')
test('fresh board is solved', () => {
  assertTrue(isSolved(newSolvedBoard(3)))
  assertTrue(isSolved(newSolvedBoard(4)))
  assertTrue(isSolved(newSolvedBoard(5)))
})

test('one move away is not solved', () => {
  const b = newSolvedBoard(3)
  // Slide tile at (2, 1) into empty at (2, 2)
  const next = applyMove(b, { r: 2, c: 1 }) as Board
  assertTrue(!isSolved(next))
})

// ── applyMove ─────────────────────────────────────────────────

console.log('\n=== applyMove: legal moves ===')
test('slide tile right into empty', () => {
  const b = newSolvedBoard(3)
  // Empty is at (2,2). Tile 6 is at (1,2). Slide 6 down.
  const next = applyMove(b, { r: 1, c: 2 }) as Board
  assertEqual(next.cells, [1, 2, 3, 4, 5, 0, 7, 8, 6])
  assertEqual(next.emptyIdx, 5)
  assertEqual(next.moves, 1)
})

test('two-move sequence returns to solved', () => {
  let b = newSolvedBoard(3)
  b = applyMove(b, { r: 1, c: 2 }) as Board
  b = applyMove(b, { r: 2, c: 2 }) as Board
  assertTrue(isSolved(b))
  assertEqual(b.moves, 2)
})

test('move count accumulates', () => {
  let b = newSolvedBoard(3)
  b = applyMove(b, { r: 1, c: 2 }) as Board
  b = applyMove(b, { r: 1, c: 1 }) as Board
  b = applyMove(b, { r: 0, c: 1 }) as Board
  assertEqual(b.moves, 3)
})

console.log('\n=== applyMove: illegal moves ===')
test('out of bounds', () => {
  const b = newSolvedBoard(3)
  const result = applyMove(b, { r: -1, c: 0 })
  assertTrue(result.error !== undefined)
  assertTrue(result.error!.includes('off the board'))
})

test('not adjacent to empty', () => {
  const b = newSolvedBoard(3)
  // Empty is at (2,2). Tile 1 is at (0,0) — not adjacent.
  const result = applyMove(b, { r: 0, c: 0 })
  assertTrue(result.error !== undefined)
  assertTrue(result.error!.includes('next to the empty'))
})

test('move the empty cell itself', () => {
  const b = newSolvedBoard(3)
  // Try to slide (2,2) which is the empty cell.
  const result = applyMove(b, { r: 2, c: 2 })
  assertTrue(result.error !== undefined)
})

// ── shuffleBoard ──────────────────────────────────────────────

console.log('\n=== shuffleBoard ===')
test('shuffle produces a non-solved board', () => {
  const b = shuffleBoard(42, 3, 50)
  assertTrue(!isSolved(b))
})

test('shuffle is deterministic per seed', () => {
  const b1 = shuffleBoard(123, 4, 30)
  const b2 = shuffleBoard(123, 4, 30)
  assertEqual(b1.cells, b2.cells)
})

test('shuffle resets move count', () => {
  const b = shuffleBoard(42, 3, 100)
  assertEqual(b.moves, 0)
})

test('shuffle 5x5 with many moves', () => {
  const b = shuffleBoard(7, 5, 500)
  assertEqual(b.size, 5)
  assertTrue(!isSolved(b))
})

// ── correctTiles ──────────────────────────────────────────────

console.log('\n=== correctTiles ===')
test('fresh board has all tiles correct', () => {
  assertEqual(correctTiles(newSolvedBoard(3)), 9)
  assertEqual(correctTiles(newSolvedBoard(4)), 16)
})

test('one tile moved gives 8/9', () => {
  const b = newSolvedBoard(3)
  const next = applyMove(b, { r: 1, c: 2 }) as Board
  assertEqual(correctTiles(next), 7)  // 7 tiles + the empty
})

// ── manhattanDistance ─────────────────────────────────────────

console.log('\n=== manhattanDistance ===')
test('fresh board has distance 0', () => {
  assertEqual(manhattanDistance(newSolvedBoard(3)), 0)
  assertEqual(manhattanDistance(newSolvedBoard(4)), 0)
})

test('one swap has distance 1', () => {
  const b = newSolvedBoard(3)
  const next = applyMove(b, { r: 1, c: 2 }) as Board
  // After move: cells = [1,2,3,4,5,0,7,8,6]
  // Tile 6 is at index 8 = (2,2). Goal position for tile 6 is
  // index 5 = (1, 2). Distance: |2-1| + |2-2| = 1.
  assertEqual(manhattanDistance(next), 1)
})

// ── Serialization ─────────────────────────────────────────────

console.log('\n=== toRows / fromRows ===')
test('toRows produces 2D array', () => {
  const b = newSolvedBoard(3)
  const rows = toRows(b)
  assertEqual(rows, [[1, 2, 3], [4, 5, 6], [7, 8, 0]])
})

test('fromRows reconstructs board', () => {
  const rows = [[1, 2, 3], [4, 5, 6], [7, 0, 8]]
  const b = fromRows(rows)
  assertEqual(b.size, 3)
  assertEqual(b.cells, [1, 2, 3, 4, 5, 6, 7, 0, 8])
  assertEqual(b.emptyIdx, 7)
})

test('toRows / fromRows round-trip', () => {
  const original = shuffleBoard(99, 4, 50)
  const rows = toRows(original)
  const restored = fromRows(rows)
  assertEqual(restored.cells, original.cells)
  assertEqual(restored.size, original.size)
  assertEqual(restored.emptyIdx, original.emptyIdx)
})

// ── isLoss ────────────────────────────────────────────────────

console.log('\n=== isLoss ===')
test('Sliding Blocks has no loss state', () => {
  assertTrue(!isLoss(newSolvedBoard(3)))
  const b = shuffleBoard(42, 3)
  assertTrue(!isLoss(b))
})

// ── Immutability ─────────────────────────────────────────────

console.log('\n=== immutability ===')
test('applyMove does not mutate input board', () => {
  const original = newSolvedBoard(3)
  const snapshot = JSON.stringify(original.cells)
  applyMove(original, { r: 1, c: 2 })
  assertEqual(JSON.stringify(original.cells), snapshot)
})

test('applyMove does not mutate emptyIdx', () => {
  const original = newSolvedBoard(3)
  const emptyBefore = original.emptyIdx
  applyMove(original, { r: 1, c: 2 })
  assertEqual(original.emptyIdx, emptyBefore)
})

// ── Summary ────────────────────────────────────────────────────

console.log('\n' + '='.repeat(50))
console.log(`RESULT: ${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.log('\nFailures:')
  for (const [name, msg] of failures) console.log(`  ${name}: ${msg}`)
}
;(globalThis as any).process.exit(fail === 0 ? 0 : 1)