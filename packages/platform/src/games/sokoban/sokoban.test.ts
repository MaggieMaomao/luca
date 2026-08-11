// Sokoban — logic tests. Guards the layered-model rebuild (was unwinnable).
import { test, eq, ok, done } from '../_testkit.ts'
import { parseLevel, newGame, move, isSolved, boxesOnTargets, targetCount } from './sokoban.ts'

test('parseLevel builds separate wall/target/box/player layers', () => {
  const s = parseLevel(['#####', '#@$.#', '#####'])
  eq(s.height, 3); eq(s.width, 5)
  ok(s.walls[0][0], 'wall')
  eq(s.player, [1, 1], 'player @')
  ok(s.boxes[1][2], 'box $')
  ok(s.targets[1][3], 'target .')
})

test('pushing the box onto its target solves the level', () => {
  const s = parseLevel(['#####', '#@$.#', '#####'])
  ok(!isSolved(s), 'not solved initially')
  const after = move(s, 0, 1) // push right
  ok(after.boxes[1][3] && after.targets[1][3], 'box now on target')
  ok(isSolved(after), 'solved')
  eq(boxesOnTargets(after), 1)
  eq(targetCount(after), 1)
})

test('a box can never overwrite/erase its target (the old bug)', () => {
  const s = parseLevel(['#####', '#@$.#', '#####'])
  const after = move(s, 0, 1)
  ok(after.targets[1][3], 'target survives the box landing on it')
})

test('every shipped level is balanced (boxes == targets)', () => {
  for (let i = 0; i < 6; i++) {
    const s = newGame(i)
    let boxes = 0
    for (const row of s.boxes) for (const b of row) if (b) boxes++
    eq(boxes, targetCount(s), `level ${i}`)
  }
})

done()
