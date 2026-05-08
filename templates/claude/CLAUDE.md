# Response Style

Ask before proceeding when: requirements are ambiguous, scope expands beyond what was asked, a change is irreversible, or touching security/auth/data migration.
Proceed autonomously when: the task is clearly scoped, tests will catch regressions, and the change is reversible.

Default: concise fragments. Pattern: `[thing] [action] [reason].`
Mid-task checkpoints (terse): `Step 2/5: schema migrated. Running tests.`
Explanations/design (prose): full sentences, grammar preserved.
Use prose for: security warnings, ambiguous sequences, error messages.

# Output Compression

The PreToolUse hook auto-rewrites verbose commands (git diff/log/show, npm install/test, pytest, docker, cargo, tsc, pip install, find, ls -la). For commands the hook doesn't catch, manually append `2>&1 | cil compress` when output is likely > 50 lines.

Modes: `--mode=lite` (filter only) | `full` (default — dedupe + group + truncate) | `ultra` (+ semantic dedup, best for test runners).

# Code

Write the minimum code that solves the stated problem. No speculative features.
Touch only what's asked. No opportunistic refactors.
Validate at boundaries (user input, external APIs). Trust internal code.
Fail fast with explicit errors. No silent failures, no swallowed exceptions.
Every bug fix ships with a test that would have caught it.

Before implementing:
1. Read relevant files. Map what exists.
2. State assumptions explicitly.
3. Define verifiable success criteria.

# Security

Never log or expose: secrets, tokens, passwords, PII.
Validate and sanitize all external input before use.
Parameterize all queries. No string interpolation into SQL/shell.
Flag any change touching auth, permissions, or data migration before proceeding.

# Context Engineering — Write / Select / Compress / Isolate

CIL implements all four. Reach for them in this order:

| Operation | When | Primitive |
|---|---|---|
| **Write** | A decision, constraint, or learning is worth keeping for the next session | `memory_store(category, content, tags[])` via MCP, or `/learn <insight>` |
| **Select** | Starting a new task — retrieve before re-deriving | `memory_search(query)` (auto-run by `/develop` Phase 1, including `feedback`-tagged corrections) |
| **Compress** | A command's output is likely > 50 lines | `cil compress` (auto via PreToolUse hook for known verbose commands) |
| **Isolate** | Two parallel tracks of work that must not contaminate each other's context | Claude Code's native worktree (`EnterWorktree` / `ExitWorktree`) — CIL does not duplicate this |

# Workflow

| When | Command |
|---|---|
| Capture acceptance criteria before coding | `/spec <feature>` |
| New feature or bug | `/develop <task>` |
| Generate tests for a file or function | `/test <target>` |
| Before committing | `/review` |
| Ready to commit | `/commit` |
| Cut a release (bump version, regenerate CHANGELOG) | `/release` |
| Context filling up or session ending | `/wrap-up` |
| Recall past decisions | `/retrieve <query>` |
| Save a specific insight | `/learn <insight>` |

Typical flow: `/spec → /develop → /test → /review → /commit → /wrap-up`.

For security audit and code simplification, use Claude Code's built-in `security-review` and `simplify` skills — CIL does not duplicate these.

Run `/wrap-up` proactively — don't wait until context is full.

# Memory

`/learn` and `/retrieve` are UX wrappers — AI should call MCP `memory_store` / `memory_search` directly.

Categories:
- `decision` — what was chosen and why
- `constraint` — limits that must be respected
- `architecture` — structural facts about the system
- `learning` — what changed your understanding (corrections auto-stored here with `feedback` tag by UserPromptSubmit hook)
- `task` — work to resume next session
- `summary` — session snapshots (written by `/wrap-up`)

Search before starting: `memory_search("topic")` — retrieve before re-deriving.

Do not store: build errors, tool output, compile warnings, task progress, temporary state.
