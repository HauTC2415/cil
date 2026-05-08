---
description: Persist a single insight, decision, or constraint to long-term memory with auto-classified category and tags.
argument-hint: <the insight to remember>
---

# /learn

Arguments: $ARGUMENTS

Persist a learning, decision, or constraint to memory.

---

## Step 1 — Classify category

- `decision` — architecture or design choice made
- `constraint` — limit or rule that must be respected
- `learning` — insight, lesson, or corrected assumption
- `task` — work item for future sessions
- `architecture` — structural or system design fact

## Step 2 — Pick a topic tag from this taxonomy

Prepend exactly **one** of these as the first tag, so future `memory_search` can filter by topic:

- `navigation` — file paths, finding code, project layout
- `editing` — code change patterns, refactoring techniques
- `testing` — test approach, framework quirks, coverage gaps
- `git` — commits, branches, merge/rebase patterns
- `quality` — lint, types, formatting, style rules
- `context` — when to clarify vs assume, scope rules
- `architecture` — design decisions, module boundaries
- `performance` — optimization, profiling, bottlenecks
- `claude-code` — sessions, modes, CLAUDE.md, skills, subagents, hooks, MCP
- `prompting` — scope, constraints, acceptance criteria
- `debugging` — root-cause findings, reproduction steps

## Step 3 — Extract additional tags

From $ARGUMENTS, extract 1–4 more specific keywords (libraries, components, files).

## Step 4 — Store

```
memory_store("[category]", "$ARGUMENTS", ["[topic-tag]", "tag2", "tag3"])
```

## Step 5 — Confirm

Report: `Stored [category] (topic: [topic-tag]): [brief summary]`
