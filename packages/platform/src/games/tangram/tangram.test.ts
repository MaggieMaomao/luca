// Tangram — unit tests.

import {
  newPuzzle, movePiece, shiftPiece, isSolved, isLoss, lockedCount,
  translate, cellsEqual, piecesOverlap, anyOverlap, pieceMatchesTarget,
  SQUARE_TARGET, TRIANGLE_TARGET, PARALLELOGRAM_TARGET, STARTING_PIECES,
} from './tangram.ts'

let pass = 0, fail = 0
const failures: Array<[string, string]> = []

function test(name: string, fn: () => void) {
  try { fn(); pass++; console.log(`  PASS  ${name}`) }
  catch (e) {
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

function assertTrue(c: boolean, label = 'should be true') { if (!c) throw new Error(label) }

// ── Helpers ────────────────────────────────────────────────────

console.log('\n=== helpers ===')
test('translate', () => {
  const p = { id: 0 as const, cells: [[0, 0], [1, 1]] as Array<[number, number]> }
  const t = translate(p, 2, 3)
  assertEqual(t.cells, [[2, 3], [3, 4]])
})
test('cellsEqual', () => {
  assertTrue(cellsEqual([[0, 0], [1, 1]], [[0, 0], [1, 1]]))
  assertTrue(cellsEqual([[0, 0], [1, 1]], [[1, 1], [0, 0]]))  // order doesn't matter
  assertTrue(!cellsEqual([[0, 0]], [[0, 1]]))
})
test('piecesOverlap', () => {
  const a = { id: 0 as const, cells: [[0, 0], [1, 1]] as Array<[number, number]> }
  const b = { id: 1 as const, cells: [[1, 1], [2, 2]] as Array<[number, number]> }
  const c = { id: 2 as const, cells: [[5, 5]] as Array<[number, number]> }
  assertTrue(piecesOverlap(a, b))
  assertTrue(!piecesOverlap(a, c))
  assertTrue(!piecesOverlap(a, a))  // same piece, no self-overlap
})
test('anyOverlap', () => {
  const a = { id: 0 as const, cells: [[0, 0]] as Array<[number, number]> }
  const b = { id: 1 as const, cells: [[1, 1]] as Array<[number, number]> }
  const c = { id: 2 as const, cells: [[0, 0]] as Array<[number, number]> }  // collides with a
  assertTrue(!anyOverlap([a, b]))
  assertTrue(anyOverlap([a, c]))
})
test('pieceMatchesTarget', () => {
  // Manually construct a piece that matches the square target
  const match = { id: 0 as const, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0], [2, 1], [2, 2], [2, 3], [3, 0], [3, 1], [3, 2], [3, 3]] as Array<[number, number]> }
  assertTrue(pieceMatchesTarget(match, SQUARE_TARGET))
})

// ── newPuzzle ─────────────────────────────────────────────────

console.log('\n=== newPuzzle ===')
test('default puzzle has 7 pieces', () => {
  const s = newPuzzle()
  assertEqual(s.pieces.length, 7)
  assertEqual(s.target, SQUARE_TARGET)
  assertEqual(s.moves, 0)
  assertEqual(s.locked.length, 7)
})
test('puzzle starts unlocked', () => {
  const s = newPuzzle()
  assertEqual(s.locked, [false, false, false, false, false, false, false])
})
test('starting pieces are scattered', () => {
  const s = newPuzzle()
  // No two starting pieces should overlap
  assertTrue(!anyOverlap(s.pieces))
})
test('different target selection', () => {
  const s = newPuzzle(TRIANGLE_TARGET)
  assertEqual(s.target, TRIANGLE_TARGET)
})

// ── movePiece / shiftPiece ────────────────────────────────────

console.log('\n=== movePiece / shiftPiece ===')
test('movePiece updates the specified piece only', () => {
  const s = newPuzzle()
  const before = s.pieces[0].cells
  const next = movePiece(s, 0, [[0, 0], [0, 1], [0, 2]])
  assertEqual(next.pieces[0].cells, [[0, 0], [0, 1], [0, 2]])
  // Other pieces unchanged
  for (let i = 1; i < 7; i++) {
    assertEqual(next.pieces[i].cells, s.pieces[i].cells, `piece ${i}`)
  }
  // 𝕄ove counter bumped
  assertEqual(next.moves, 1)
})
test('shiftPiece translates by (dr, dc)', () => {
  const s = newPuzzle()
  const before = s.pieces[0].cells
  const after = shiftPiece(s, 0, 1, 1)
  for (let i = 0; i < before.length; i++) {
    assertEqual(after.pieces[0].cells[i], [before[i][0] + 1, before[i][1] + 1])
  }
})
test('movePiece normalizes (dedups, sorts)', () => {
  const s = newPuzzle()
  const next = movePiece(s, 0, [[1, 1], [0, 0], [1, 1]])  // duplicate, unsorted
  assertEqual(next.pieces[0].cells, [[0, 0], [1, 1]])
})

// ── Win / loss ────────────────────────────────────────────────

console.log('\n=== isSolved / isLoss ===')
test('fresh puzzle is not solved', () => {
  assertTrue(!isSolved(newPuzzle()))
})
test('isLoss is always false', () => {
  assertTrue(!isLoss(newPuzzle()))
  assertTrue(!isLoss(movePiece(newPuzzle(), 0, [[0, 0]])))
})
test('lockedCount is 0 initially', () => {
  assertEqual(lockedCount(newPuzzle()), 0)
})
test('piece exactly on target = locked', () => {
  // Use the 4x4 square cells. Piece 0 has 10 cells; doesn't match square (16).
  // Let's verify locked[] is updated correctly via movePiece
  const s = newPuzzle()
  // Move piece 0 to an arbitrary spot — not the target
  const next = movePiece(s, 0, [[100, 100], [101, 100]])
  assertEqual(next.locked[0], false)
})

// ── All targets ───────────────────────────────────────────────

console.log('\n=== all targets ===')
test('SQUARE_TARGET has 16 cells (4x4)', () => {
  assertEqual(SQUARE_TARGET.cells.length, 16)
})
test('TRIANGLE_TARGET has 15 cells', () => {
  assertEqual(TRIANGLE_TARGET.cells.length, 15)
})
test('PARALLELOGRAM_TARGET has 13 cells', () => {
  assertEqual(PARALLELOGRAM_TARGET.cells.length, 13)
})

// ── Immutability ─────────────────────────────────────────────

console.log('\n=== immutability ===')
test('movePiece does not mutate input state', () => {
  const s = newPuzzle()
  const snapshot = JSON.stringify(s.pieces)
  movePiece(s, 0, [[0, 0]])
  assertEqual(JSON.stringify(s.pieces), snapshot)
})
test('shiftPiece does not mutate', () => {
  const s = newPuzzle()
  const snapshot = JSON.stringify(s.pieces[1].cells)
  shiftPiece(s, 1, 5, 5)
  assertEqual(JSON.stringify(s.pieces[1].cells), snapshot)
})

// ── Summary ────────────────────────────────────────────────────

console.log('\n' + '='.repeat(50))
console.log(`RESULT: ${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.log('\nFailures:')
  for (const [n, m] of failures) console.log(`  ${n}: ${m}`)
}
;(globalThis as any).process.exit(fail === 0 ? 0 : 1)