---
name: database-design
description: Use when designing a database schema from scratch or evaluating storage trade-offs — entity modeling, normalization, indexing strategy, SQL vs NoSQL choice, read/write patterns, schema evolution plan. Complements the migration skill (which handles changing existing schemas).
---

# Database Design Skill

## Project Context

### Existing project

1. **Read `CLAUDE.md`** — existing schema conventions, DB constraints, or naming rules take priority.
2. **Identify the DB and ORM** — PostgreSQL/MySQL/SQLite/MongoDB? Raw SQL, TypeORM, Prisma, SQLAlchemy, GORM? Read 2–3 existing model/schema files to understand naming (snake_case vs camelCase), primary key style (uuid vs serial), and timestamp conventions.
3. **Check the existing schema** — new entities must follow the same patterns: column naming, index naming, foreign key style, soft-delete convention.
4. **Understand the migration workflow** — how does this project evolve schema? (See the `migration` skill.) Design with the migration path in mind — changes that can't be migrated safely are bad designs.
5. **Search memory** — `memory_search("database schema [entity] design")` — retrieve prior schema decisions, normalization choices, or known performance constraints.
6. Consistency with existing tables beats theoretical correctness.

### Greenfield project

No schema exists yet — foundational choices here are expensive to undo:

1. **Choose the database and query layer together** — the query layer (ORM, query builder, or raw queries) constrains which DB features you can use cleanly. Choose the pairing that fits the platform and team, not just the DB in isolation.
2. **Set naming conventions before the first table** — decide and document:
   - Table/collection naming style (singular vs plural, casing)
   - Primary key style (auto-increment integer, UUID, or platform-specific)
   - Timestamp columns (`created_at`, `updated_at` on every record; `deleted_at` if soft-delete is needed)
   - Foreign key naming pattern
3. **Do the access pattern analysis first** (see Protocol step 1 below) — schema designed without knowing the read/write queries will need expensive rework.
4. **Design for migration** — columns should be nullable or have cheap defaults so future schema changes don't require table rewrites or long locks.
5. **Write conventions into `CLAUDE.md`** — naming rules, primary key style, soft-delete approach. This prevents divergence as the codebase grows.
6. **Store the decisions:**
   ```
   memory_store("decision", "db: [database]+[query layer], PKs=[style], naming=[style], soft-delete=[x]", ["database", "schema", "conventions"])
   ```

## When to activate

- Designing a new data model from scratch
- Choosing between storage options (PostgreSQL, MySQL, MongoDB, Redis, SQLite, etc.)
- Evaluating whether to normalize or denormalize
- Planning indexes for a known query pattern
- Designing for multi-tenancy or sharding
- Deciding on schema evolution strategy before any migration

## Protocol

### 1. Understand access patterns first

Schema follows queries — not the other way around:
- What are the top 5 read queries by frequency?
- What are the top 3 write operations by frequency?
- What is the read/write ratio?
- What consistency guarantees are required? (strong, eventual, per-entity)
- What is the expected data volume and growth rate?

### 2. Entity model

- Identify entities and their attributes
- Map relationships: one-to-one, one-to-many, many-to-many
- Identify natural keys vs surrogate keys
- Flag nullable vs required fields with justification

### 3. Normalization decision

| Form | Use when |
|------|----------|
| 3NF (fully normalized) | Write-heavy, data integrity critical, updates are frequent |
| Partial denorm | Read-heavy, joins are expensive, OLAP workloads |
| Flat/document | Highly variable schema, embedded reads dominate, no cross-entity queries |

Denormalization is a deliberate performance trade-off — document the reason.

### 4. Indexing strategy

- Index columns used in WHERE, JOIN ON, ORDER BY
- Composite index column order: most selective first, then range columns
- Avoid over-indexing writes (each index slows INSERT/UPDATE)
- For full-text search: FTS5 (SQLite), GIN (PostgreSQL), dedicated search engine
- Check query plans before and after adding indexes

### 5. Schema evolution plan

Before finalizing design, answer:
- How will new columns be added without downtime? (nullable default or backfill?)
- How will table renames or column renames be handled? (dual-write period?)
- Is there a soft-delete strategy? (deleted_at timestamp vs hard delete)
- Are audit columns needed? (created_at, updated_at, created_by)

### 6. SQL vs NoSQL decision

| Factor | Favor SQL | Favor NoSQL |
|--------|-----------|-------------|
| Schema stability | ✓ | |
| Complex joins | ✓ | |
| ACID transactions | ✓ | |
| Variable/nested structure | | ✓ |
| Horizontal write scaling | | ✓ |
| Read-heavy with known keys | | ✓ (key-value) |
