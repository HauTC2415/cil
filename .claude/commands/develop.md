# /develop

Task: $ARGUMENTS

---

## Phase 1 — Research

Before writing any code:

1. Understand the request fully. If ambiguous, present 2–3 interpretations and confirm which.
2. Read relevant files. Map what already exists. Use Grep/Glob to find related code.
3. Search memory for prior decisions: `memory_search("$ARGUMENTS")`
4. List assumptions explicitly. State them before proceeding.
5. Define success criteria — verifiable, concrete, testable.

Do not proceed until assumptions are confirmed and success criteria are clear.

---

## Phase 2 — Plan

Present a concise plan:

- **Goal**: one sentence
- **Files to modify**: list with reason
- **Files to create**: list with reason
- **Steps**: numbered, each independently completable
- **Risks**: what could go wrong
- **Mitigations**: how to handle each risk

Wait for explicit approval before proceeding to implementation.
If the plan changes during implementation, return to this phase.

---

## Phase 3 — Implement

- One step at a time.
- Run tests or verify output after each logical unit.
- Checkpoint every 5 edits: "Checkpoint [N/total]: [what done]. [what next]."
- Touch only what's in the plan. No opportunistic refactors.
- If blocked or plan is wrong: stop and report, don't guess.

---

## Phase 4 — Verify

Self-review before reporting done:

1. Read the diff. Does it match the plan?
2. Verify each success criterion is met.
3. Check for regressions in adjacent code.
4. Run /review if changes are significant.

Store key decisions: `memory_store("decision", "[what was decided and why]", ["$ARGUMENTS"])`

Report: "Done. [one-line summary]. [any open questions]."
