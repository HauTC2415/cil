# Skill: Architecture

Service boundaries and structural decisions.

## Decision Framework

Before adding a component or crossing a boundary, ask:

1. **Cohesion** — Do these things always change together? If yes, keep together.
2. **Coupling** — What depends on this? Can I change the implementation without changing callers?
3. **Ownership** — Who owns this data? Is there a single source of truth?
4. **Boundary** — What crosses this boundary? Can I state it in one sentence?

If you can't explain a boundary in one sentence, it's wrong.

## Dependency Direction

```
Domain (core logic)
  ← Application (use cases)
    ← Infrastructure (DB, HTTP, IO)
      ← Entry points (CLI, API, events)
```

Domain has zero infrastructure dependencies.

## Heuristics

- Small interfaces > large interfaces. Narrow contracts, stable contracts.
- Composition > inheritance. Prefer has-a over is-a.
- Duplication < wrong abstraction. Wait for the third occurrence.
- If two services always deploy together, merge them.
- If one change requires updating many files, the abstraction is wrong.

## Anti-patterns

- Circular dependencies (A → B → A)
- God object (everything depends on one thing)
- Shared mutable state across boundaries
- Premature abstraction (abstract before you see the pattern)
- Distributed monolith (microservices with synchronous coupling)
