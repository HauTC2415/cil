---
name: testing
description: Use when writing or reviewing tests — choosing what to test, structuring test suites, deciding on real deps vs mocks, or after fixing a bug (regression test). Emphasizes testing behavior over implementation and progressing boundary → happy path → edge cases → errors.
---

# Skill: Testing

Validate behavior, not implementation.

## Project Context

### Existing project

1. **Read `CLAUDE.md`** — project rules take priority (mock policy, test scope, forbidden patterns).
2. **Identify the test runner** — check the project manifest or config files to find what's already installed. Use it — never add a second test framework.
3. **Read existing tests** — find 2–3 test files in the same module. Match their structure: file naming, test block nesting, assertion style, import paths, setup/teardown patterns.
4. **Check mock policy** — does the project use real dependencies in tests, or mocks/stubs? Never introduce a strategy that contradicts what's already in use.
5. **Search memory** — `memory_search("testing [component] conventions")` — retrieve prior decisions about test scope or mock strategy.
6. Apply the protocol below within the project's conventions, not instead of them.

### Greenfield project

No tests yet — you are establishing the conventions others will follow:

1. **Choose the test runner** — use the standard one for the language/platform. Don't introduce a less-common alternative without a clear reason.
2. **Decide file layout upfront** — co-located next to source files, or in a separate test directory. Pick one and document it. Changing later requires moving many files.
3. **Set the mock policy** — prefer real dependencies where practical (catches integration bugs); mock only at expensive or unstable external boundaries. Document the policy in `CLAUDE.md`.
4. **Write the first test as the template** — naming convention, assertion style, setup/teardown — this becomes the pattern every contributor follows.
5. **Store the decision:**
   ```
   memory_store("decision", "testing: runner=[x], layout=[x], mock policy=[x]", ["testing", "conventions"])
   ```

## Protocol

1. **Boundary first** — Test the outermost contract (API, function signature, CLI output).
2. **Happy path** — Core case works with valid input.
3. **Edge cases** — Empty input, null, zero, max values, type boundaries.
4. **Error cases** — Invalid input fails with the right error and message.
5. **Regression** — Every bug fix gets a test that would have caught it.

## Rules

- Test behavior, not internal implementation details.
- One logical assertion per test concept.
- Descriptive names: `returns_404_when_user_not_found`, not `test_user`.
- Real dependencies > mocks. Mocks hide integration failures.
- If it's hard to test, the code is too coupled — fix the design.

## Structure

```
describe("feature")
  describe("happy path")
    it("does the thing")
  describe("edge cases")
    it("handles empty input")
    it("handles null")
  describe("errors")
    it("throws on invalid input")
```

## Anti-patterns

- Mocking everything (tests pass, prod breaks)
- Testing private methods (couples tests to implementation)
- One giant test (hard to diagnose failures)
- Tests that always pass (no real assertions)
