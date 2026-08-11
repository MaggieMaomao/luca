// Minimal shared test harness for the per-game logic tests.
//
// Run any test with:  node --experimental-strip-types src/games/<slug>/<slug>.test.ts
// Each test file registers cases with test(...) then calls done() to print a
// "RESULT: X passed, Y failed" summary and exit (0 = all pass).

let pass = 0
let fail = 0
const failures: Array<[string, string]> = []

export function test(name: string, fn: () => void): void {
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

/** Deep-equality assertion (via JSON). */
export function eq<T>(actual: T, expected: T, label = 'values differ'): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

export function ok(cond: boolean, label = 'should be true'): void {
  if (!cond) throw new Error(label)
}

export function done(): void {
  console.log('\n' + '='.repeat(50))
  console.log(`RESULT: ${pass} passed, ${fail} failed`)
  if (fail > 0) {
    console.log('\nFailures:')
    for (const [name, msg] of failures) console.log(`  ${name}: ${msg}`)
  }
  // `process` is provided by the node runner; cast to satisfy strict TS
  // without pulling in @types/node.
  ;(globalThis as { process?: { exit(code: number): never } }).process?.exit(fail === 0 ? 0 : 1)
}
