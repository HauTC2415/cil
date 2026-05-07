# Skill: Testing

Validate behavior, not implementation.

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
