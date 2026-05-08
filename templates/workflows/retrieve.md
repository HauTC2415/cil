---
description: Full-text search persistent memory (BM25) and present results grouped by category — decisions, constraints, learnings, tasks.
argument-hint: <search query>
---

# /retrieve

Arguments: $ARGUMENTS

Search persistent memory for relevant context.

---

## Step 1 — Search

```
memory_search("$ARGUMENTS", 8)
```

---

## Step 2 — Present results

Group by category. For each result:
- Category: [decision|constraint|learning|task|architecture]
- Content: [the stored text]
- Relevance: why this matches the query

---

## Step 3 — If empty

"No memories found for: $ARGUMENTS"

Suggest: use /learn to store relevant context for future sessions.

---

## Step 4 — Apply

Use retrieved context to inform current task. Don't re-derive what's already known.
