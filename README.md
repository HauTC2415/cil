# @hautc/cil — Claude Intelligence Layer

> Token-efficient context runtime for Claude Code

[![npm](https://img.shields.io/npm/v/@hautc/cil)](https://www.npmjs.com/package/@hautc/cil)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

CIL transforms Claude Code into a context-aware, token-efficient engineering system by combining the best ideas from [context-mode](https://github.com/mksglu/context-mode), [pro-workflow](https://github.com/rohitg00/pro-workflow), [caveman](https://github.com/JuliusBrussee/caveman), [RTK](https://github.com/rtk-ai/rtk), and [Andrej Karpathy Skills](https://github.com/forrestchang/andrej-karpathy-skills).

---

## Features

| Feature | What it does |
|---|---|
| **Persistent Memory** | SQLite FTS5 stores decisions, constraints, learnings across sessions |
| **Slash Commands** | `/develop`, `/review`, `/commit`, `/wrap-up`, `/learn`, `/retrieve` |
| **MCP Server** | `memory_store`, `memory_search`, `session_snapshot`, `session_restore` |
| **Hook System** | `PostToolUse` + `PreCompact` + `Stop` — automatic context continuity |
| **Engineering Skills** | debugging, testing, architecture, performance heuristics |
| **Bounded Agents** | planner, researcher, reviewer, implementer templates |
| **Token Efficiency** | ≤2KB session snapshots, compressed context, BM25 retrieval |

---

## Install

```bash
npm install -g @hautc/cil
cil init
```

> Requires: Node.js >= 20 · Claude Code

---

## Quick Start

```bash
# 1. Initialize your project
cd my-project
cil init

# 2. Verify
cil doctor

# 3. Open Claude Code
claude

# 4. Use slash commands
/develop implement OAuth2 login
/review
/commit
/wrap-up
```

---

## How it works

### Architecture

```
Claude Code
  ├── CLAUDE.md           ← engineering principles (auto-loaded)
  ├── .claude/commands/   ← slash commands: /develop /review /commit ...
  └── hooks               ← PostToolUse, PreCompact, Stop
          ↓
    CIL Runtime
          ↓
  ┌──────────────────────┐
  │ MCP Server           │  memory_store / memory_search
  │ SQLite FTS5 (BM25)   │  ranked retrieval, no vector DB needed
  │ Session Snapshots    │  ≤2KB state preserved across compactions
  └──────────────────────┘
          ↓
    ~/.cil/memory.db      ← persistent across all sessions
```

### Session continuity

Every time Claude Code compacts context, the `PreCompact` hook fires and injects a memory summary so Claude never loses key decisions.

```
Session 1                     Session 2
  /develop auth    →  /wrap-up stores decisions
                       PreCompact saves snapshot
                            ↓
                       session_restore() loads context
                         [decision] Use JWT, not sessions
                         [constraint] Token must expire in 1h
                         [learning] Refresh tokens need separate table
```

---

## Slash Commands

Install location: `.claude/commands/` (local) or `~/.claude/commands/` (global with `cil init -g`)

### `/develop <task>`

Research → Plan → Implement → Verify cycle.

1. **Research**: reads existing code, searches memory, surfaces assumptions
2. **Plan**: presents approach, waits for approval before any code
3. **Implement**: incremental with checkpoints every 5 edits
4. **Verify**: self-review against success criteria

```
/develop implement user authentication with JWT
```

### `/review`

Systematic code review checklist: correctness, regressions, security, performance, style.

```
/review
```

### `/commit`

Generates conventional commit messages. Checks for sensitive files before staging.

```
/commit
```

### `/wrap-up`

End-of-session protocol. Captures decisions, learnings, constraints to SQLite. Creates session snapshot.

```
/wrap-up
```

### `/learn <insight>`

Persist a specific insight to memory.

```
/learn we use camelCase for API fields but snake_case in DB — conversion in repository layer
```

### `/retrieve <query>`

Full-text search over all stored memories.

```
/retrieve auth decisions
/retrieve database schema
```

---

## MCP Tools

Available inside Claude Code sessions when the MCP server is registered.

### `memory_store(category, content, tags[])`

Store a memory entry.

```
Categories: decision | constraint | learning | task | architecture | summary
```

### `memory_search(query, limit?)`

FTS5 full-text search with BM25 ranking.

### `session_snapshot(summary, decisions[])`

Save a compact (≤2KB) session state for cross-session continuity.

### `session_restore()`

Retrieve the last session snapshot + recent memories.

---

## CLI Reference

```bash
cil init [--global] [--skip-mcp] [--skip-hooks]
cil doctor
cil compact
cil retrieve [query] [-n limit] [-c category]
cil reset [--db] [--all]
```

| Command | Description |
|---|---|
| `cil init` | Initialize CIL (CLAUDE.md, workflows, hooks, MCP) |
| `cil init --global` | Install commands globally to `~/.claude/commands/` |
| `cil doctor` | Validate all components |
| `cil compact` | Print context snapshot from memory |
| `cil retrieve "query"` | Search memory |
| `cil reset --db` | Clear memory database |

---

## Skills

Reusable cognitive heuristics installed to `.cil/skills/`:

- **debugging** — root cause analysis protocol
- **testing** — integration validation patterns  
- **architecture** — service boundary decisions
- **performance** — profile-first optimization

Reference in Claude: "Use the debugging skill to analyze this error."

---

## Configuration

### What `cil init` does

1. Creates `~/.cil/memory.db` (SQLite)
2. Copies `CLAUDE.md` to project root
3. Installs slash commands to `.claude/commands/`
4. Installs skills to `.cil/skills/`
5. Configures hooks in `.claude/settings.json`
6. Registers `cil-mcp` with Claude Code

### Hooks installed

```json
{
  "hooks": {
    "PostToolUse": [{ "hooks": [{ "type": "command", "command": "cil hook post-tool-use" }] }],
    "PreCompact":  [{ "hooks": [{ "type": "command", "command": "cil hook pre-compact" }] }],
    "Stop":        [{ "hooks": [{ "type": "command", "command": "cil hook session-stop" }] }]
  }
}
```

---

## Philosophy

> Less context. More signal.  
> Less prompting. More reasoning.  
> Single agent first. Escalate only when needed.

**Core principles** (from CLAUDE.md):
- Think before coding. Surface assumptions first.
- Surgical changes — touch only what's asked.
- Store decisions, not transcripts.
- Retrieve by relevance only.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
