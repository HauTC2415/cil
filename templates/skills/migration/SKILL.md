---
name: migration
description: Use when changing a database schema or backfilling data in production — adding/removing columns, changing types, dropping tables, reindexing. Enforces lock-impact analysis, dual-write transitions, and rollback plans before any DDL runs.
---

# Skill: Database Migration

A migration is a deploy event, not a code change. Reason about it that way.

## Project Context

### Existing project

1. **Read `CLAUDE.md`** — migration rules, DB constraints, or deploy-window requirements take priority.
2. **Identify the database and migration tool** — read existing migration files to understand the naming convention, file structure, and execution mechanism already in use.
3. **Check data volume** — how many rows are in the affected table? This determines whether the migration is instant or requires a maintenance window and special handling.
4. **Read existing migration patterns** — how does this project handle rollbacks? Are down migrations written? Are backfills done inside the migration or via a separate script?
5. **Search memory** — `memory_search("migration [table] schema")` — retrieve prior decisions, known lock patterns, or constraints on this table.
6. Apply the checklist and patterns below within the project's established approach.

### Greenfield project

No schema exists yet — foundational choices here are expensive to undo:

1. **Choose the migration tool** — use the standard one for the platform and ORM in use. Prefer a dedicated migration tool over raw SQL files; it gives you history, ordering, and reproducibility.
2. **Establish file naming convention** — timestamp prefix (`YYYYMMDDHHMMSS_description`) is safer than sequential numbers for teams working on parallel branches.
3. **Add audit columns from day one** — `created_at`, `updated_at` (and `deleted_at` if soft-delete is needed) on every table. Retrofitting these later requires locking every table.
4. **Decide rollback strategy upfront** — write down migrations from day one, or explicitly document that the project uses forward-only migrations. Changing this policy later is disruptive.
5. **Set the backfill standard** — batched (small chunks), idempotent (safe to re-run), throttled (leave headroom for live traffic). Write this into `CLAUDE.md`.
6. **Store the decision:**
   ```
   memory_store("decision", "migrations: tool=[x], naming=[timestamp], rollback=[x], audit cols=created_at+updated_at", ["migration", "database", "conventions"])
   ```

## Pre-flight checklist

Before running any DDL:

1. **Lock impact** — does this hold a table lock? For how long? On which row range?
2. **Backfill cost** — rows × time-per-row. Will it run inside the deploy window?
3. **Read path during migration** — what does the old code see? What does the new code see?
4. **Rollback plan** — can you undo this in <5 minutes if traffic breaks?
5. **Replication lag** — does this fan out to read replicas synchronously?

If any of these are unknown, stop and find out.

## Safe-by-default patterns

### Adding a column
1. Add the column **nullable** with no default (or DB-cheap default).
2. Deploy code that **writes** to the new column (still reads from old).
3. Backfill in batches with rate limit (`UPDATE ... WHERE id BETWEEN ... LIMIT 1000`).
4. Deploy code that **reads** from the new column.
5. Drop old column after one full deploy cycle of soak.

NOT_NULL constraints come **after** backfill, never with the original `ADD COLUMN`.

### Renaming a column
Don't. Add new + dual-write + migrate readers + drop old. Renaming is a schema break disguised as a one-liner.

### Changing a type
Add new column with new type → backfill with conversion → switch readers → drop old. Same pattern as rename.

### Dropping a table or column
1. Confirm zero readers (search code, check query logs for ≥7 days).
2. Mark it deprecated for a full release cycle.
3. Stop writing.
4. Drop.

### Adding an index
- On large tables: `CREATE INDEX CONCURRENTLY` (Postgres) / online build (MySQL InnoDB) — don't take a long lock.
- Verify the new index is actually being used (`EXPLAIN`) before relying on it.

## Backfill rules

- **Batched** (1k–10k rows per query). One giant `UPDATE` blocks.
- **Idempotent** — safe to re-run if interrupted. `WHERE new_col IS NULL` filter.
- **Throttled** — leave headroom for live traffic. Pause if replica lag exceeds threshold.
- **Audited** — log batch progress so you know how far it got on failure.

## Rollback

Every migration has a rollback. Even forward-only DDLs need a code-level rollback (revert the deploy that depended on the new schema).

If you can't roll back cleanly: split the migration into smaller steps until you can.

## Anti-patterns

- `ALTER TABLE` on a multi-million-row table during peak traffic
- `ADD COLUMN ... NOT NULL DEFAULT 'something'` on a large table (rewrites the whole table on some DBs)
- Renaming columns or tables (reads/writes from old code break the moment the migration runs)
- Backfilling in one query (locks, replicates badly, no resume on failure)
- Dropping a column the same day you stopped writing to it — give the change a soak period
