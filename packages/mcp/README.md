# @luca-game/mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for
[Luca](https://github.com/MaggieMaomao/luca) — let your AI coding agent build a
game end to end.

## Tools

| Tool | What it does |
|---|---|
| `luca_get_agent_guide` | Returns `AGENTS.md` — read this first. |
| `luca_get_contract` | The action-engine `Game<State, Intent, Ev>` contract. |
| `luca_list_games` | All registered game slugs. |
| `luca_scaffold_game` | Scaffolds a valid, test-passing game + prints the registration edits. |
| `luca_validate` | Structured, fix-oriented validation (files, registration, purity, test). |
| `luca_run_tests` | Runs the platform test suite. |

Together they support the **generate → validate → fix** loop: scaffold, edit,
`luca_validate`, fix the reported issues, repeat until `luca_run_tests` is green.

## Setup

Clone Luca and point your MCP client at the server (stdio). Example client config
(Claude Desktop / Cursor / etc.):

```json
{
  "mcpServers": {
    "luca": {
      "command": "node",
      "args": ["/absolute/path/to/luca/packages/mcp/index.mjs"],
      "env": { "LUCA_ROOT": "/absolute/path/to/luca" }
    }
  }
}
```

Then, in your agent: *"Using the luca tools, build a game called star_catch."*
It will read the guide, scaffold, register, validate, and test.

MIT © MaggieMaomao
