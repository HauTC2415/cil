# /learn

Arguments: $ARGUMENTS

Persist a learning, decision, or constraint to memory.

---

## Step 1 — Classify

Determine category from context:
- `decision` — architecture or design choice made
- `constraint` — limit or rule that must be respected
- `learning` — insight, lesson, or corrected assumption
- `task` — work item for future sessions
- `architecture` — structural or system design fact

---

## Step 2 — Extract tags

From $ARGUMENTS, extract 2–5 relevant keywords as tags.

---

## Step 3 — Store

```
memory_store("[category]", "$ARGUMENTS", ["tag1", "tag2"])
```

---

## Step 4 — Confirm

Report: "Stored [category]: [brief summary of what was stored]"
