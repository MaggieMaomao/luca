#!/usr/bin/env node
/**
 * @luca-game/mcp — a Model Context Protocol server for Luca.
 *
 * Lets an AI agent build a Luca game end-to-end via tools: read the agent guide
 * + contract, list games, scaffold a game, validate it (structured, fix-oriented),
 * and run the tests — the generate → validate → fix loop, over MCP.
 *
 * Run (stdio): luca-mcp   (from a checkout of the Luca repo, or set LUCA_ROOT).
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function repoRoot() {
  for (const p of [process.env.LUCA_ROOT, process.cwd(), join(__dirname, '..', '..')]) {
    if (p && existsSync(join(p, 'packages', 'platform', 'src', 'games'))) return p
  }
  return join(__dirname, '..', '..')
}
const ROOT = repoRoot()
const lucaCli = join(ROOT, 'packages', 'luca-cli', 'index.mjs')
const createCli = join(ROOT, 'packages', 'create-luca-game', 'index.mjs')

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' })
  return ((r.stdout || '') + (r.stderr || '')).trim()
}
const text = (t) => ({ content: [{ type: 'text', text: t || '(no output)' }] })
const isSlug = (s) => typeof s === 'string' && /^[a-z][a-z0-9_]*$/.test(s)

const TOOLS = [
  { name: 'luca_get_agent_guide', description: 'Return AGENTS.md — the canonical, literal instructions for adding/modifying a Luca game. Read this first.', inputSchema: { type: 'object', properties: {} } },
  { name: 'luca_get_contract', description: 'Return the action-engine Game<State,Intent,Ev> contract source (what a game must implement).', inputSchema: { type: 'object', properties: {} } },
  { name: 'luca_list_games', description: 'List all registered game slugs (JSON).', inputSchema: { type: 'object', properties: {} } },
  { name: 'luca_scaffold_game', description: 'Scaffold a new, valid, test-passing action game into packages/platform/src/games/<slug>/. Returns the created files and the three registration edits to make.', inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'lowercase letters/digits/underscores, e.g. star_catch' } }, required: ['slug'] } },
  { name: 'luca_validate', description: 'Validate a game (files present, registration in the 3 places, logic purity, and the test passes). Returns structured, fix-oriented JSON — use it to drive the generate→validate→fix loop.', inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] } },
  { name: 'luca_run_tests', description: 'Run the full platform test suite (npm test) and return the summary.', inputSchema: { type: 'object', properties: {} } },
]

const server = new Server({ name: 'luca', version: '0.1.0' }, { capabilities: { tools: {} } })

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: a = {} } = req.params
  try {
    switch (name) {
      case 'luca_get_agent_guide':
        return text(readFileSync(join(ROOT, 'AGENTS.md'), 'utf8'))
      case 'luca_get_contract':
        return text(run('node', [lucaCli, 'contract']))
      case 'luca_list_games':
        return text(run('node', [lucaCli, 'list', '--json']))
      case 'luca_scaffold_game':
        if (!isSlug(a.slug)) return { content: [{ type: 'text', text: 'Invalid slug (lowercase letters/digits/underscores).' }], isError: true }
        return text(run('node', [createCli, a.slug]))
      case 'luca_validate':
        if (!isSlug(a.slug)) return { content: [{ type: 'text', text: 'Invalid slug.' }], isError: true }
        return text(run('node', [lucaCli, 'validate', a.slug, '--json']))
      case 'luca_run_tests':
        return text(run('npm', ['test']).slice(-4000))
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
    }
  } catch (e) {
    return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true }
  }
})

await server.connect(new StdioServerTransport())
