---
name: api-design
description: Use when designing or reviewing a public API surface — REST/GraphQL/gRPC, versioning, idempotency, error contracts, pagination, auth boundary. Helps choose between transport styles and avoid breaking-change footguns.
---

# Skill: API Design

A public contract is forever. Cheap to add a field; impossible to remove one.

## Project Context

### Existing project

1. **Read `CLAUDE.md`** — API conventions, versioning rules, or auth patterns already decided take priority.
2. **Check existing routes** — read 2–3 existing endpoints. Match their URL structure, naming convention, HTTP method usage, and response envelope shape.
3. **Find the error format** — search for existing error responses. Use the exact same shape — never introduce a second error schema.
4. **Check auth middleware** — how is authentication done in existing routes? Apply the same pattern (middleware, guard, decorator) — don't invent a new one.
5. **Check pagination** — does the project already use cursor or offset pagination? Don't mix styles.
6. **Search memory** — `memory_search("api design [resource] convention")` — retrieve prior decisions on versioning, naming, or error format.
7. Consistency with the established contract beats theoretical perfection.

### Greenfield project

No API exists yet — you are setting the contract others will depend on:

1. **Choose transport** — use the Decision table below. Default to REST unless there's a concrete reason not to.
2. **Define the error shape once** — write it down before the first endpoint. Every endpoint returns this exact shape — no exceptions.
3. **Set versioning strategy** — pick one approach (URL prefix, header, or media type) and document it in `CLAUDE.md`. Don't let each endpoint invent its own.
4. **Decide auth approach** — stateless token, session, or API key. Pick one that matches the deployment model. Document token lifetime and refresh/revocation strategy.
5. **Set pagination style** — cursor-based for any collection that grows; offset only for truly static or small data. Mixing styles later is a breaking change.
6. **Write `CLAUDE.md` entries** for each decision so contributors don't re-litigate them.
7. **Store the decisions:**
   ```
   memory_store("decision", "api: transport=[x], error shape=[x], versioning=[x], auth=[x], pagination=[x]", ["api", "conventions"])
   ```

## Decision: which transport

| Choose | When |
|---|---|
| **REST** | Resource-shaped domain, broad client variety, CDN-cacheable reads |
| **GraphQL** | Many clients with divergent fetch needs, deeply nested reads, schema evolution |
| **gRPC** | Internal service-to-service, low latency, strongly typed contracts, streaming |
| **RPC over HTTP (POST /<verb>)** | Action-shaped (not resource-shaped) operations |

If unsure: REST. It's the lowest common denominator.

## Versioning

- Bake version into the URL (`/v1/...`) or media type (`Accept: application/vnd.foo.v1+json`). Header-based hides the version from logs and grep.
- Add fields freely. Never **remove** or **rename** a field in a stable version — deprecate first, remove in next major.
- Booleans become enums become strings. Default to `string` for status-like fields.

## Idempotency

- All `PUT`, `DELETE` are idempotent by definition. Make `POST /<resource>` idempotent via `Idempotency-Key` header when retries matter (payments, signups).
- Server keeps the result of first call by key for ≥24h, returns same response on retry.

## Error contracts

- One error shape across the whole API:
  ```json
  { "error": { "code": "user.not_found", "message": "...", "details": {} } }
  ```
- `code` is a stable enum (machine-readable), `message` is human-readable (translatable later).
- HTTP status follows semantics: 400 client mistake, 401 unauthenticated, 403 unauthorized, 404 missing, 409 conflict, 422 validation, 429 rate limit, 5xx server.

## Pagination

- Cursor-based (`?cursor=opaque-token&limit=N`) for anything that grows. Offset pagination breaks under concurrent inserts.
- Always cap `limit` server-side. Never trust client.

## Auth boundary

- Authentication: **who are you** (token, session). Authorization: **what can you do** (per-resource check).
- Both happen at the edge. Never inside business logic.
- Authorize per-resource on **every** read/write. "User has token" ≠ "user can read this resource".

## Anti-patterns

- 200 OK with `{ "error": ... }` body — clients can't distinguish success from failure without parsing
- Mixing pagination styles within one API
- Fields that change shape based on a query param (use a different endpoint)
- Client-generated IDs (race conditions; can't enforce server invariants)
- Returning DB column names verbatim (couples API to schema)
