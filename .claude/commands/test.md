---
description: Generate a test scaffold for a file or function following the testing skill protocol — boundary, happy path, edge cases, error cases. Does not run; produces the file.
argument-hint: <file path or function name>
---

# /test

Target: $ARGUMENTS

TDD assist — applies the `testing` skill protocol to produce a runnable test scaffold.

---

## Step 1 — Read the target

Open the target file (or find the function across the repo). Identify:
- **Public API** of what's being tested (exports, function signatures, observable side effects).
- **Inputs**: types, ranges, optional vs required.
- **Outputs**: return value, thrown errors, side effects (DB writes, file writes, network).

If the target is a folder or unclear, ask which symbol to test.

---

## Step 2 — Detect the test framework

Check `package.json` (`devDependencies`) and existing tests:
- vitest → `describe / it / expect` from `vitest`
- jest → `describe / it / expect` from `jest`
- node --test → `node:test` runner
- pytest (Python) → `def test_*` functions
- go test → `func Test*(t *testing.T)`

Match the existing convention. Don't introduce a new framework.

---

## Step 3 — Generate cases (testing skill protocol)

Group into 4 sections:

1. **Boundary** — outermost contract: function signature, public API.
2. **Happy path** — core valid case works.
3. **Edge cases** — empty, null, zero, max, type boundaries, unusual but valid input.
4. **Error cases** — invalid input fails with the correct error and message.

For each case: descriptive name (`returns_404_when_user_not_found`, not `test_user`), arrange-act-assert structure, one logical assertion per `it`.

---

## Step 4 — Write the file

Co-locate with existing tests (mirror their location):
- TS/JS: `src/.../__tests__/<name>.test.ts`
- Python: `tests/test_<name>.py`

If a test file already exists, **append** new cases — don't overwrite.

Prefer **real dependencies** over mocks (testing skill rule). Mock only when crossing a network boundary.

---

## Step 5 — Verify the scaffold runs

Run the test command (`npm test`, `pytest`, `go test ./...`). All new tests should fail with a meaningful error if the target doesn't exist yet, OR pass if the target is already correct.

If runner errors out (compile error, import failure), fix the test scaffold — never commit a non-running test file.

---

## Step 6 — Persist

```
memory_store("learning", "added tests for $ARGUMENTS — covers <one-line of what>", ["test", "$ARGUMENTS"])
```

---

## Output

> Tests written: <path>. <N> cases. Run: <test command>.
