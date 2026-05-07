# /develop

Task: $ARGUMENTS

---

## Phase 1 — Research

Before writing any code:

1. Understand the request fully. If ambiguous, present 2–3 interpretations and confirm which.
2. Read relevant files. Map what already exists. Use Grep/Glob to find related code.
3. Search memory: `memory_search("$ARGUMENTS")`
4. List assumptions explicitly. State them before proceeding.
5. Define success criteria — verifiable, concrete, testable.

---

## Phase 2 — Feasibility Score (from pro-workflow)

Score each dimension 0–10 before planning. Proceed only if total ≥ 35/50.

| Dimension | Score | Notes |
|---|---|---|
| Scope clarity | /10 | Is the task well-defined? |
| Pattern familiarity | /10 | Have we seen similar code here? |
| Dependency awareness | /10 | Do we know what this touches? |
| Edge case coverage | /10 | Are failure cases understood? |
| Test strategy | /10 | Can we verify the result? |
| **Total** | **/50** | |

If total < 35: return to Phase 1. Resolve gaps before proceeding.

---

## Phase 3 — Plan

Present a concise plan:

- **Goal**: one sentence
- **Files to modify**: list with reason
- **Files to create**: list with reason
- **Steps**: numbered, each independently completable
- **Risks**: what could go wrong
- **Mitigations**: how to handle each risk

**Wait for explicit approval before proceeding.**
If the plan changes during implementation, return to this phase.

---

## Phase 4 — Implement

- One step at a time.
- Test or verify output after each logical unit.
- Checkpoint every 5 edits (ultra tier): "Step [N/total]: [done]. [next]."
- Touch only what's in the plan. No opportunistic refactors.
- If blocked or plan changes: stop and report. Don't improvise.

---

## Phase 5 — Verify

Self-review before reporting done:

1. Read the diff. Does it match the plan?
2. Verify each success criterion.
3. Check for regressions in adjacent code.
4. Run /review if changes are significant.

Store key decisions:
```
memory_store("decision", "[what + why]", ["$ARGUMENTS"])
```

Report (full tier): "Done. [one-line summary]. [any open questions]."
