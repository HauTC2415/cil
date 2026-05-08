---
description: Capture testable acceptance criteria for a feature before implementation. BA hat — ambiguities surfaced, scope bounded, success defined.
argument-hint: <feature or change description>
---

# /spec

Feature: $ARGUMENTS

Produce a written spec **before** `/develop` so success criteria are explicit, not inferred.

---

## Step 1 — Clarify intent

Ask the user (or restate, if clear):
- **Who** is this for? (user role, system, internal)
- **Why** now? (problem being solved, trigger)
- **What changes** for the user when this exists?

If any of these are unclear, list 2–3 interpretations and ask.

---

## Step 2 — Acceptance criteria (Given/When/Then)

Write 3–7 concrete, testable scenarios. Each one should be a single clear behavior — not a list of features.

```
Scenario 1: <name>
  Given <starting state>
  When  <action>
  Then  <observable outcome>

Scenario 2: ...
```

Cover at minimum: **happy path**, **one edge case**, **one failure mode**.

---

## Step 3 — Out of scope

Bullet list of related things that look in-scope but are NOT being done now. This prevents scope creep during `/develop`.

---

## Step 4 — Open questions

Anything you couldn't decide alone. Flag explicitly — don't assume.

---

## Step 5 — Persist

Store the spec for cross-session continuity:

```
memory_store("decision", "spec for $ARGUMENTS — <one-line summary>", ["spec", "$ARGUMENTS"])
```

For each acceptance criterion:
```
memory_store("constraint", "$ARGUMENTS must <criterion>", ["spec", "acceptance"])
```

---

## Output

Print the spec, ending with:

> Spec ready. Next: `/develop $ARGUMENTS`.
