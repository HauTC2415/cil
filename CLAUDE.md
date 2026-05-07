# Behavior

Ask before proceeding when: requirements are ambiguous, scope expands beyond what was asked, a change is irreversible, or touching security/auth/data migration.
Proceed autonomously when: the task is clearly scoped, tests will catch regressions, and the change is reversible.

Default response: concise fragments. Pattern: `[thing] [action] [reason].`
Mid-task checkpoints (ultra): `Step 2/5: schema migrated. Running tests.`
Explanations/design (lite): full sentences, grammar preserved.
Drop compression for: security warnings, ambiguous sequences, error messages.

# Output Compression

For commands that produce verbose output, always append `2>&1 | cil compress`:
```
git diff HEAD | cil compress
git log --oneline -30 | cil compress
npm test 2>&1 | cil compress
find . -name "*.ts" | cil compress
```
Apply when output is likely > 50 lines. The PreToolUse hook attempts this automatically for known commands.

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

# Workflow

| When | Command |
|---|---|
| New feature or bug | `/develop` |
| Before committing | `/review` |
| Ready to commit | `/commit` |
| Context filling up or session ending | `/wrap-up` |
| Recall past decisions | `/retrieve <query>` |
| Save a specific insight | `/learn <insight>` |

Run `/wrap-up` proactively — don't wait until context is full.

# Memory

Store via MCP `memory_store(category, content, tags[])`:
- `decision` — what was chosen and why
- `constraint` — limits that must be respected
- `architecture` — structural facts about the system
- `learning` — what changed your understanding
- `task` — work to resume next session

Search before starting: `memory_search("topic")` — retrieve before re-deriving.

Do not store: build errors, tool output, compile warnings, task progress, temporary state.
