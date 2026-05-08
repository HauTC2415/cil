# Quickstart

## Install

```bash
npm install -g cil
```

## Initialize your project

```bash
cd my-project
cil init
```

This installs:
- `CLAUDE.md` with engineering principles
- `.claude/commands/` with `/develop`, `/review`, `/commit`, `/wrap-up`, `/learn`, `/retrieve`
- `.claude/skills/<name>/SKILL.md` and `.claude/agents/<name>.md` (both auto-discovered by Claude Code)
- Claude Code hooks for session continuity
- CIL MCP server for persistent memory

Verify:
```bash
cil doctor
```

## Start Claude Code

```bash
claude
```

## Develop a feature

```
/develop implement user authentication with JWT
```

CIL guides Claude through:
1. Research — reads existing code, searches memory for prior auth decisions
2. Plan — presents approach, waits for approval
3. Implement — incremental with checkpoints
4. Verify — self-review against success criteria

## Review changes

```
/review
```

Systematic checklist: correctness, regressions, security, performance.

## Commit

```
/commit
```

Generates a conventional commit message, checks for sensitive files.

## End of session

```
/wrap-up
```

Captures learnings, decisions, constraints to SQLite. Creates session snapshot for next time.

## Next session

When you start a new Claude Code session, the pre-compact hook automatically injects your memory summary. Or restore explicitly:

```
session_restore()
```

Or search memory:

```
/retrieve auth decisions
```

Or via CLI:

```bash
cil retrieve "auth"
cil compact
```
