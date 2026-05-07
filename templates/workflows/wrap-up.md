# /wrap-up

End-of-session protocol. Capture learnings before context is lost.

---

## Step 1 — Summarize

What was accomplished this session? One paragraph, factual.

---

## Step 2 — Capture learnings

For each insight from this session:

Questions to ask:
- What worked well and should be repeated?
- What was surprising, wrong, or unexpected?
- What would you do differently next time?
- What constraints were discovered?

Store each learning:
```
memory_store("learning", "[the insight]", ["relevant", "tags"])
```

**What to store:** decisions, constraints, architecture facts, discovered limitations, patterns that worked.
**Do NOT store:** build errors, compile warnings, temporary bugs fixed during the session, tool output logs.

---

## Step 3 — Capture decisions

For each architecture or design decision made:

```
memory_store("decision", "[what was decided] — [why]", ["component", "area"])
```

---

## Step 4 — Capture constraints

For any constraint discovered (performance limits, API quirks, team rules):

```
memory_store("constraint", "[the constraint and where it applies]", ["area"])
```

---

## Step 5 — Plan next session

- What is unfinished?
- What is the first task to pick up next time?

Store as task:
```
memory_store("task", "[next task description]", ["next-session"])
```

---

## Step 6 — Housekeeping

```bash
git status
```

Flag any uncommitted work. Don't leave things dangling.

Create session snapshot:
```
session_snapshot("[session summary in 1-2 sentences]", ["decision1", "decision2"])
```
