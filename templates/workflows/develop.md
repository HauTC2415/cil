---
description: Structured development cycle — Research → Feasibility → Plan → Implement → Verify with persistent memory and feedback replay.
argument-hint: <task description>
---

# /develop $ARGUMENTS

## 1. Research
- If $ARGUMENTS is ambiguous, present 2–3 interpretations and confirm before proceeding.
- Read relevant files; map what already exists (Grep/Glob).
- Run `memory_search("$ARGUMENTS")` AND `memory_search("feedback")` (replay prior corrections).
- List assumptions explicitly. Define verifiable, concrete success criteria.

## 2. Feasibility — proceed only if total ≥ 35/50
| Dim | /10 | Notes |
|---|---|---|
| Scope clarity | | well-defined? |
| Pattern familiarity | | similar code here? |
| Dependency awareness | | what does it touch? |
| Edge cases | | failure modes understood? |
| Test strategy | | how to verify? |

If < 35: return to Research and resolve gaps before planning.

## 3. Plan — block on user approval
Goal (one sentence) · Files to **modify** (with reason) · Files to **create** (with reason) · Steps (numbered, each independently completable) · Risks · Mitigations.

## 4. Implement
One step at a time. Verify after each unit. Touch only what's in the plan — no opportunistic refactors. If blocked or plan changes: stop and report, don't improvise.

## 5. Verify
Read diff vs plan · check each success criterion · scan adjacent code for regressions · run `/review` if changes are significant. Store key decisions: `memory_store("decision", "what + why", ["$ARGUMENTS"])`.
