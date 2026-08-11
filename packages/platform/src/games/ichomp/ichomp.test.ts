// iChomp — logic tests. Guards the solo-vs-AI Chomp rebuild (was unwinnable).
import { test, ok, done } from '../_testkit.ts'
import { newGame, applyMove, aiMove, isWin, isLoss, isGameOver } from './ichomp.ts'

test('eating the poison loses immediately', () => {
  const dead = applyMove(newGame(4), 0, 0)
  ok(isLoss(dead) && !isWin(dead) && isGameOver(dead), 'poison = loss, game over')
})

test('both win and loss are reachable vs the AI (none undecided)', () => {
  let wins = 0, losses = 0, undecided = 0
  for (let t = 0; t < 60; t++) {
    let s = newGame(4), g = 0
    while (!isGameOver(s) && g++ < 100) {
      if (s.turn !== 'player') { const m = aiMove(s); if (!m) break; s = applyMove(s, m[0], m[1]); continue }
      const safe: Array<[number, number]> = []
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (s.grid[r][c] && !(r === 0 && c === 0)) safe.push([r, c])
      if (safe.length === 0) { s = applyMove(s, 0, 0); break } // forced onto poison
      const p = safe[Math.floor(Math.random() * safe.length)]
      s = applyMove(s, p[0], p[1])
      if (s.loser === null && s.turn === 'ai') { const m = aiMove(s); if (m) s = applyMove(s, m[0], m[1]) }
    }
    if (isWin(s)) wins++; else if (isLoss(s)) losses++; else undecided++
  }
  ok(wins > 0 && losses > 0, `wins=${wins} losses=${losses}`)
  ok(undecided === 0, 'every game decided')
})

done()
