# @hautc.it/cil — Claude Intelligence Layer

> Token-efficient context runtime for Claude Code

[![npm](https://img.shields.io/npm/v/@hautc.it/cil)](https://www.npmjs.com/package/@hautc.it/cil)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

CIL transforms Claude Code into a context-aware, token-efficient engineering system by combining the best ideas from [context-mode](https://github.com/mksglu/context-mode), [pro-workflow](https://github.com/rohitg00/pro-workflow), [caveman](https://github.com/JuliusBrussee/caveman), [RTK](https://github.com/rtk-ai/rtk), and [Andrej Karpathy Skills](https://github.com/forrestchang/andrej-karpathy-skills).

---

## Install

```bash
npm install -g @hautc.it/cil
```

> **Requires:** Node.js >= 20 · [Claude Code](https://claude.ai/code)

> **Note:** The MCP memory server uses `better-sqlite3` (native addon). Pre-built binaries are included for Windows x64, macOS, and Linux x64. If your platform is unsupported, `npm install` will attempt to compile from source — requires Python and a C++ compiler.

---

## Quick Start

```bash
# 1. Install globally
npm install -g @hautc.it/cil

# 2. Initialize in your project
cd my-project
cil init

# 3. Verify everything is working
cil doctor

# 4. Open Claude Code
claude

# 5. Use slash commands inside Claude Code
/develop implement OAuth2 login
/review
/commit
/wrap-up
```

---

## What `cil init` installs

| What | Where | Purpose |
|---|---|---|
| `CLAUDE.md` | `./CLAUDE.md` | Engineering principles, auto-loaded by Claude Code |
| Slash commands | `./.claude/commands/` | `/develop` `/review` `/commit` `/wrap-up` `/learn` `/retrieve` |
| Skills | `./.cil/skills/` | Debugging, testing, architecture, performance heuristics |
| Agents | `./.cil/agents/` | Planner, researcher, reviewer, implementer templates |
| Hooks | `./.claude/settings.json` | PreToolUse, PostToolUse, PreCompact, Stop |
| MCP server | `~/.claude.json` (user scope) | Persistent memory tools for Claude |
| Memory DB | `~/.cil/memory.db` | SQLite FTS5 — shared across all projects |

For global slash commands (available in every project without re-running `cil init`):

```bash
cil init --global
```

---

## Slash Commands

### `/develop <task>`

Structured development cycle: Research → Feasibility Score → Plan → Implement → Verify.

- Searches memory before starting — no re-deriving known context
- Scores feasibility across 5 dimensions before writing any code
- Waits for approval before implementing
- Checkpoints every 5 edits

```
/develop implement user authentication with JWT
```

### `/review`

Systematic checklist: correctness, regressions, security (injection, exposed secrets), performance (N+1, blocking I/O), style.

### `/commit`

Generates conventional commit messages (`feat:`, `fix:`, `refactor:`...). Checks for sensitive files before staging.

### `/wrap-up`

End-of-session protocol. Saves decisions, learnings, and constraints to persistent memory. Creates a session snapshot for continuity in the next session.

### `/learn <insight>`

```
/learn JWT refresh tokens need a separate DB table — access token is stateless
```

### `/retrieve <query>`

Full-text search over all stored memories across sessions.

```
/retrieve auth decisions
/retrieve database schema constraints
```

---

## MCP Memory Server

The MCP server runs locally and gives Claude structured, searchable memory that persists across all sessions and projects.

**Important:** Only store meaningful context — decisions, constraints, learnings, architecture facts. Do not store build errors, task logs, or temporary debugging output.

### Tools

**`memory_store(category, content, tags[])`**

```
Categories: decision | constraint | learning | task | architecture | summary
```

Example — Claude calls this automatically during `/wrap-up`:
```
memory_store("decision", "Use JWT stateless auth — no session table needed", ["auth", "jwt"])
memory_store("constraint", "Access token expires in 1h — enforced by API gateway", ["auth"])
memory_store("learning", "Refresh tokens require separate DB table with revocation support", ["auth", "db"])
```

**`memory_search(query, limit?)`**

BM25 full-text search. Called by Claude at the start of `/develop` to retrieve relevant prior context.

**`session_snapshot(summary, decisions[])`**

Saves ≤2KB session state. Called during `/wrap-up`. Injected automatically before context compaction via the `PreCompact` hook.

**`session_restore()`**

Retrieves the last snapshot + recent memories. Call at the start of a new session to restore context without re-explaining the project.

---

## Output Compression

CIL includes RTK-style output compression to reduce token usage from verbose commands.

**Manual use:**
```bash
git diff | cil compress
npm test 2>&1 | cil compress
git log --oneline -50 | cil compress
```

**Automatic:** The `PreToolUse` hook attempts to pipe known verbose commands (git diff/log, npm test, etc.) through `cil compress` before Claude sees the output.

---

## CLI Reference

| Command | Description |
|---|---|
| `cil init` | Initialize CIL in current project |
| `cil init --global` | Install slash commands globally (`~/.claude/commands/`) |
| `cil doctor` | Validate all components |
| `cil compact` | Print current memory snapshot |
| `cil retrieve "query"` | Search memory |
| `cil compress` | Compress stdin (pipe tool) |
| `cil reset --db` | Clear memory database |

---

## Session Continuity Flow

```
Session 1
  └── /develop auth
  └── /wrap-up
        └── memory_store("decision", "use JWT") → ~/.cil/memory.db
        └── session_snapshot("implemented auth layer")

  [context compaction]
        └── PreCompact hook fires
        └── injects memory summary into compacted context

Session 2 (new day)
  └── /develop refresh token
        └── memory_search("auth") → retrieves prior decisions
        └── Claude knows JWT choice, 1h expiry constraint
        └── no re-explanation needed
```

---

## Philosophy

> Less context. More signal.
> Less prompting. More reasoning.
> Single agent first. Escalate only when needed.

Inspired by: [context-mode](https://github.com/mksglu/context-mode) · [pro-workflow](https://github.com/rohitg00/pro-workflow) · [caveman](https://github.com/JuliusBrussee/caveman) · [RTK](https://github.com/rtk-ai/rtk) · [Andrej Karpathy Skills](https://github.com/forrestchang/andrej-karpathy-skills)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
