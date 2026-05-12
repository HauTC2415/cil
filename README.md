# @hautc.it/cil — Claude Intelligence Layer

> Token-efficient context runtime for Claude Code

[![npm](https://img.shields.io/npm/v/@hautc.it/cil)](https://www.npmjs.com/package/@hautc.it/cil)
[![CI](https://github.com/HauTC2415/cil/actions/workflows/ci.yml/badge.svg)](https://github.com/HauTC2415/cil/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

CIL gives Claude Code **persistent memory**, **automatic output compression**, and **structured workflows** — so context survives across sessions and token usage stays predictable. Inspired by [context-mode](https://github.com/mksglu/context-mode), [pro-workflow](https://github.com/rohitg00/pro-workflow), [caveman](https://github.com/JuliusBrussee/caveman), [RTK](https://github.com/rtk-ai/rtk), and [Andrej Karpathy Skills](https://github.com/forrestchang/andrej-karpathy-skills).

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
| Slash commands | `./.claude/commands/` | `/spec` `/develop` `/test` `/review` `/commit` `/wrap-up` `/learn` `/retrieve` `/auto-setup` `/handoff` `/onboard` |
| Skills | `./.claude/skills/<name>/SKILL.md` | Debugging, testing, architecture, performance, API design, database migration, security design, database design — auto-loaded by Claude Code via frontmatter |
| Agents | `./.claude/agents/<name>.md` | Researcher, planner, implementer, reviewer — auto-routed by Claude Code's Agent tool via frontmatter |
| Hooks | `./.claude/settings.json` | PreToolUse, PostToolUse, PreCompact, Stop, UserPromptSubmit |
| MCP server | `~/.claude.json` (user scope) | Persistent memory tools for Claude |
| Memory DB | `~/.cil/memory.db` | SQLite FTS5 — shared across all projects |

For global slash commands (available in every project without re-running `cil init`):

```bash
cil init --global
```

**Flags:**
- `--global` — install slash commands to `~/.claude/commands/` (available across all projects)
- `--skip-mcp` — skip MCP server registration (useful if registering manually or in CI)
- `--skip-hooks` — skip writing hook config to `.claude/settings.json`

---

## Slash Commands

### `/spec <feature>`

BA hat — capture testable acceptance criteria (Given/When/Then) before implementation. Scope explicitly bounded; ambiguities surfaced; spec persisted to memory so `/develop` and `/test` can reference it.

```
/spec password reset via email link
```

### `/develop <task>`

Structured development cycle: Research → Feasibility Score → Plan → Implement → Verify.

- Searches memory before starting — no re-deriving known context
- **Replays standing rules** from `feedback`-tagged memories (corrections from prior sessions)
- Scores feasibility across 5 dimensions before writing any code
- Waits for approval before implementing
- Checkpoints every 5 edits

```
/develop implement user authentication with JWT
```

### `/test <file or fn>`

TDD assist — generates a test scaffold following the `testing` skill protocol (boundary → happy → edge → error). Auto-detects framework from `package.json` (vitest/jest/pytest/go test) and matches existing test layout.

```
/test src/lib/auth.ts
/test verifyToken
```

### `/review`

Systematic checklist: correctness, regressions, security (injection, exposed secrets), performance (N+1, blocking I/O), style.

### `/commit`

Generates conventional commit messages (`feat:`, `fix:`, `refactor:`...). Checks for sensitive files before staging.

### `/wrap-up`

End-of-session protocol. Saves decisions, learnings, and constraints to persistent memory. Creates a session snapshot for continuity in the next session.

### `/learn <insight>`

Stores the insight with a category (`decision`/`constraint`/`learning`/`task`/`architecture`) **plus a topic tag** from a fixed taxonomy (`navigation`/`editing`/`testing`/`git`/`quality`/`context`/`architecture`/`performance`/`claude-code`/`prompting`/`debugging`) — so future `/retrieve` queries can filter by topic.

```
/learn JWT refresh tokens need a separate DB table — access token is stateless
```

### `/retrieve <query>`

Full-text search over all stored memories across sessions.

```
/retrieve auth decisions
/retrieve database schema constraints
```

### `/auto-setup`

Inspects the project root for `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / `pom.xml`, identifies lint/typecheck/test commands from the actual scripts present, and proposes additions to `CLAUDE.md` and `.claude/settings.json`. **Applies nothing without explicit approval** — purely diagnostic + diff preview.

```
/auto-setup
```

### `/handoff`

Fast session handover — produces a paste-ready resume command for the next session. Use when context is filling up and you want to preserve state before `/compact`. Lighter than `/wrap-up` (no full audit checklist); output-focused.

```
/handoff
```

### `/onboard`

Structured codebase orientation before making changes to an unfamiliar project. Maps entry points, conventions, recent git activity, and retrieves prior memory about the project. Run this on any repo you haven't touched before (or haven't touched in a while).

```
/onboard
```

---

## Agents

Installed by `cil init` into `.claude/agents/`, auto-routed by Claude Code's Agent tool via frontmatter:

| Agent | Use when |
|---|---|
| `researcher` | Map existing code, call graphs, prior decisions before modifying |
| `planner` | Break a feature into ordered subtasks with files-touched + risks |
| `implementer` | Execute a well-specified subtask, no architectural decisions open |
| `reviewer` | Audit a diff for correctness, security, regressions, style |
| `debugger` | Reproduce → hypothesize → investigate → root cause → propose fix. **No code edits** — returns a report. Use for failing tests or bugs that span multiple files (keeps grep noise out of main context) |

---

## Skills

Installed by `cil init` into `.claude/skills/`, auto-loaded by Claude Code when their topic is relevant:

| Skill | Use when |
|---|---|
| `debugging` | Reproduce a bug → form ranked hypotheses → investigate code paths → propose minimal fix |
| `testing` | Generate test scaffolds (boundary → happy → edge → error); detect framework from `package.json` |
| `architecture` | Evaluate design trade-offs, component boundaries, or system evolution decisions |
| `performance` | Identify and measure bottlenecks (N+1, blocking I/O, cache misses) before optimizing |
| `api-design` | Design or review a public API surface — REST/GraphQL/gRPC, versioning, idempotency, error contracts, auth boundary |
| `migration` | Change a database schema or backfill data safely — lock-impact analysis, dual-write transitions, rollback plans before any DDL runs |
| `security` | Threat modeling, trust boundaries, auth design, input validation, secret management, dependency risk — design-time security decisions (complements Claude Code's built-in `/security-review`) |
| `database-design` | Design a schema from scratch — entity modeling, normalization, indexing strategy, SQL vs NoSQL decision, schema evolution plan |

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

CIL includes RTK-style per-tool output compression to reduce token usage from verbose commands.

**Modes** (`--mode=lite|full|ultra`, default `full`):
- `lite` — strip ANSI/noise only; no dedup or truncation
- `full` — 4-pillar pipeline (filter, dedupe, group, truncate)
- `ultra` — adds semantic dedup (collapse PASSED tests into a count, etc.)

**Per-tool dispatch:** the compressor auto-detects `git`, `npm`, `pytest`, `docker`, `cargo`, `tsc`, or `pip` output and applies tool-specific filters before the generic pipeline (e.g. drops `index abc..def` lines from git diffs, dedupes repeated `npm WARN deprecated`, collapses Docker layer-pull progress, hides `Compiling crate v…` cargo noise, summarizes repeated TS error codes per file, dedupes `Requirement already satisfied` from pip).

**Manual use:**
```bash
git diff | cil compress
npm test 2>&1 | cil compress --mode=ultra
git log --oneline -50 | cil compress
```

**Automatic:** The `PreToolUse` hook pipes **every Bash command** through `cil compress` before Claude sees the output. Mode is auto-selected per command:

- `ultra` — test runners and installers (`pytest`, `npm test`/`install`, `cargo test`, `vitest`, `jest`, `pip install`, `go test`).
- `full` — verbose tools with structured output (`git diff/log/show`, `npm run build`, `docker`, `eslint`, `make`, `mvn`, `tsc`, etc.).
- `lite` — default for any unrecognized command (ANSI strip only, no dedup/truncate — safe for arbitrary scripts).
- *skipped* — trivial commands with no expected output (`cd`, `mkdir`, `mv`, `cp`, `rm`, `chmod`, `touch`, `export`, `echo`, `:`).

**Measured reduction** (run `npm run benchmark` to reproduce):

| Sample | Input lines | Lite | Full | Ultra |
|---|---|---|---|---|
| git diff (50 hunks) | 500 | 24% | 24% | 24% |
| npm install w/ deprecation noise | 38 | 86% | 86% | 86% |
| pytest (200 pass, 3 fail) | 219 | 0% | 0% | 95% |
| docker build (12 steps + layer pulls) | 67 | 48% | 48% | 48% |
| cargo build (50 crates + warnings) | 56 | 87% | 87% | 87% |
| tsc (40 errors across 5 files) | 41 | 48% | 48% | 48% |
| pip install (50 already satisfied + 5 new) | 61 | 96% | 96% | 96% |
| generic (warnings + stack frames) | 43 | 8% | 86% | 86% |

---

## Hooks

CIL installs five Claude Code hooks that work silently in the background:

| Hook | Event | What it does |
|---|---|---|
| `PreToolUse` | Every Bash call | Rewrites the command to pipe output through `cil compress` — keeps tool output token-efficient automatically |
| `PostToolUse` | After every tool | Error-loop detection + context-size warning (see below) |
| `PreCompact` | Before `/compact` | Injects relevant memories + last session snapshot into the compacted context so Claude doesn't lose key decisions |
| `Stop` | Session end | Logs activity to the memory DB for future relevance ranking |
| `UserPromptSubmit` | Every user message | Detects corrections ("don't do that", "no, instead…") and auto-stores them as `feedback`-tagged memories — replayed at the start of every `/develop` session |

### Correction Memory

When you correct Claude ("stop adding comments", "use tabs not spaces", "don't mock the DB in tests"), the `UserPromptSubmit` hook captures the rule automatically — no `/learn` needed. It is stored as a `learning` memory with the `feedback` tag and replayed at the start of future `/develop` sessions. Medium and high-confidence corrections only; low-confidence phrases are ignored.

### Context-Pressure Signals

Two `PostToolUse` signals push back on the "error → fix → error → fix" loops that bloat context:

**Error-loop detection.** After 3 consecutive tool errors in the same session, CIL injects a one-time `additionalContext` telling Claude to stop iterating and re-think the root cause. At 6+ consecutive errors, it escalates with a stronger STOP message and a `systemMessage` shown to you. Each tier fires once per session — no spam.

**Transcript-size warning.** After every tool call, CIL stats the transcript file. When it exceeds the threshold (default **420 KB ≈ 120K tokens** — the convergence point of "12% of a 1M-token window" and "60% of a 200K-token window"), it injects a one-time hint asking Claude to summarize the current task state and prompt you to run `/compact`. Override the threshold via the env var:

```bash
export CIL_CONTEXT_WARN_BYTES=300000   # warn earlier (e.g. for Haiku 100K)
export CIL_CONTEXT_WARN_BYTES=900000   # warn later (e.g. for 1M-token models)
```

Both signals are advisory — Claude still decides what to do. The hook can suggest `/compact`; only you (or Claude on your behalf) can run it.

---

## CLI Reference

| Command | Description |
|---|---|
| `cil init` | Initialize CIL in current project |
| `cil init --global` | Install slash commands globally (`~/.claude/commands/`) |
| `cil init --skip-mcp` | Skip MCP server registration |
| `cil init --skip-hooks` | Skip hook config in `.claude/settings.json` |
| `cil doctor` | Validate all components |
| `cil upgrade` | Check npm for new version + sync templates; runs `npm install -g` if update available |
| `cil upgrade --check` | Preview what would change without applying |
| `cil upgrade --global` | Upgrade the global install (affects `~/.claude/commands/`) |
| `cil uninstall` | Remove CIL templates, hooks, and MCP from the current project |
| `cil uninstall --global` | Remove the global install |
| `cil uninstall --purge` | Also delete `~/.cil/` memory database |
| `cil compact` | Print current memory snapshot |
| `cil retrieve "query"` | Full-text search over memory |
| `cil retrieve -n 20 "query"` | Limit results (default 8) |
| `cil retrieve -c decision "query"` | Filter by category |
| `cil compress` | Compress stdin (pipe tool, default `--mode=full`) |
| `cil compress --mode=ultra` | Add semantic dedup (best for test output) |
| `cil compress --mode=lite` | Filter ANSI/noise only, no dedup |
| `cil compress -n 100` | Limit output to 100 lines |
| `cil export [--out file.json]` | Export memory + sessions as JSON |
| `cil import <file.json>` | Import a JSON export (deduped by content hash) |
| `cil prune --older-than=90d` | Delete memory older than threshold |
| `cil prune --older-than=90d --dry-run` | Preview count without deleting |
| `cil prune --older-than=90d -c task` | Limit prune to one category |
| `cil reset --db` | Clear memory database |
| `cil reset --all` | Clear all CIL data |

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

## Usage Flows

Real end-to-end scenarios showing how to get the most out of CIL.

### Starting a new feature

```
/spec add user notifications via email     # capture acceptance criteria
/develop implement email notifications     # research → plan → implement → verify
/test src/lib/email.ts                     # generate test scaffold
/review                                    # systematic checklist
/commit                                    # conventional commit message
```

### Entering an unfamiliar codebase

```
/onboard                    # map project, read conventions, retrieve prior memory
/develop fix the bug        # now you know the codebase — proceed with context
```

### Context filling up mid-task

```
/handoff                    # capture state, produce resume command
/compact                    # PreCompact hook injects your snapshot automatically
# ── next session ──
# paste the resume command Claude produced in /handoff
```

### End of work session (thorough closeout)

```
/review                     # check your work
/commit                     # commit with conventional message
/wrap-up                    # capture decisions, constraints, learnings → memory
```

### Recalling past decisions

```
/retrieve auth decisions
/retrieve database schema constraints
/retrieve why we chose X
```

### Designing a new system

```
/spec new payment processing feature
# Claude activates database-design skill for schema,
# api-design skill for endpoints, security skill for auth boundary
/develop implement payment processing
/test src/lib/payment.ts
/review
/commit
```

### Security review before shipping

```
/review                     # CIL security skill: threat model, input validation, secrets
# also run Claude Code's built-in:
/security-review            # code-level vulnerability scan
```

### Full project lifecycle

```
# Feature loop:
/spec → /develop → /test → /review → /commit

# Session management:
/handoff                    # when context is filling up
/wrap-up                    # at end of session

# Next session:
/retrieve [topic]           # recall prior decisions before starting
/onboard                    # if returning after a long absence

# Releasing:
/release                    # bump version, update CHANGELOG, push tag
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
