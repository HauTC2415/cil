---
description: Fast session handover — capture current state and write a resume command for the next session. Use when context is filling up or you need to switch tasks.
---

# /handoff

Fast session handover. Produces a paste-ready resume command for the next session.

**When to use:** context is filling up, you need to step away, or switching tasks mid-session.
**vs /wrap-up:** /wrap-up is a thorough end-of-session checklist. /handoff is quick and output-focused.

---

## Step 1 — Capture git state

```bash
git status --short
git log --oneline -5
```

Note: current branch, uncommitted files, last few commits.

---

## Step 2 — What is in progress right now?

State clearly:
- Active task (1 sentence)
- File/function/area being worked on
- Immediate next action (specific enough to act on without re-reading this context)

---

## Step 3 — Save new learnings or gotchas

For each non-obvious thing discovered this session — unexpected behaviors, footguns, constraints:

```
memory_store("learning", "[insight]", ["relevant", "tags"])
```

Skip insights already stored. Focus on what would trip up the next session.

---

## Step 4 — Create session snapshot

```
session_snapshot("[1–2 sentence status: what's done, what's in progress]", ["decision1", "decision2"])
```

The PreCompact hook will inject this automatically at the next /compact.

---

## Step 5 — Write resume command

Output a single paragraph ready to paste into the next session:

> **Resume:** Continuing [task] on branch `[branch]`. [Key context: what's done, what's pending, what to avoid]. Uncommitted: [files or "clean"]. Next action: [specific step].

---

## Step 6 — Compact

Run `/compact` now. The PreCompact hook injects the snapshot from Step 4.
