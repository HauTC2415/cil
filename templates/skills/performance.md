# Skill: Performance

Measure first. Optimize the right thing.

## Protocol

1. **Profile** — Identify the actual bottleneck. Don't guess. Use profiler, metrics, or timing.
2. **One change** — Change one variable at a time. Otherwise you can't tell what helped.
3. **Algorithm first** — O(n log n) beats O(n²) regardless of constants. Fix the algorithm.
4. **I/O second** — Reduce round trips. Batch reads/writes. Use connection pools.
5. **Cache last** — Caching hides problems. Fix the underlying query/computation first.

## Database

- EXPLAIN the query plan before optimizing.
- Index on columns in WHERE, JOIN ON, ORDER BY.
- SELECT only the columns you need.
- Avoid N+1: use JOIN or batch fetch, never query in a loop.
- Paginate large result sets. Never SELECT *.
- Use read replicas for read-heavy workloads.

## Application

- Avoid synchronous I/O in request paths.
- Pool connections (DB, HTTP, Redis).
- Lazy-load what isn't needed on startup.
- Avoid holding locks across I/O.
- Profile memory, not just CPU.

## Anti-patterns

- Premature optimization (before measuring)
- Optimizing cold paths (measure which path is hot first)
- Cache without invalidation strategy
- Adding indexes without analyzing query plans
- Treating all latency as CPU (often it's I/O waiting)
