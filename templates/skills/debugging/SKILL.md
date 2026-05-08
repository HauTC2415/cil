---
name: debugging
description: Use when investigating a bug, regression, or unexpected behavior. Enforces reproduce → isolate → hypothesize → verify → fix → prevent — fixing root causes rather than symptoms, and adding a regression test before closing.
---

# Skill: Debugging

Root cause analysis. Fix causes, not symptoms.

## Protocol

1. **Reproduce** — Confirm the bug is reproducible. Get exact error, stack trace, input that triggers it.
2. **Isolate** — Binary search the call stack. Last correct state? First incorrect state?
3. **Hypothesize** — One hypothesis. What single change would cause this behavior?
4. **Verify** — Test hypothesis with minimal reproduction. Add log or assertion to confirm.
5. **Fix** — Fix only the root cause. Don't fix symptoms or add guards around bugs.
6. **Prevent** — Add a test that would have caught this. Document the invariant.

## Heuristics

- Recent change? Check git log. Regression = diff caused it.
- Intermittent? Look for race conditions, shared state, external timing.
- Only in prod? Check environment differences: config, data scale, concurrency.
- Works locally? Check dependency versions, build artifacts, env vars.

## Anti-patterns

- Adding workarounds without understanding root cause
- Fixing multiple things simultaneously (masks which fix worked)
- Guessing without a reproduction case
- Adding try/catch to hide errors instead of fix them
