---
name: api-design
description: Use when designing or reviewing a public API surface — REST/GraphQL/gRPC, versioning, idempotency, error contracts, pagination, auth boundary. Helps choose between transport styles and avoid breaking-change footguns.
---

# Skill: API Design

A public contract is forever. Cheap to add a field; impossible to remove one.

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
