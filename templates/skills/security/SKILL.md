---
name: security
description: Use when designing or reviewing a system for security properties — threat modeling, trust boundaries, auth design, input validation strategy, secret management, dependency risk. Focuses on design-time security decisions, not just code-level vulnerabilities (use Claude Code's built-in security-review skill for code scanning).
---

# Security Design Skill

## Project Context

### Existing project

1. **Read `CLAUDE.md`** — security rules, compliance requirements, or auth decisions already made take priority.
2. **Check the existing auth system** — read the auth middleware, session/token handling, and permission checks already in place. Extend the existing pattern — never introduce a parallel auth mechanism.
3. **Check secret management** — how does this project load secrets (env vars, vault, config file)? Match that approach; never add a new secret-loading method.
4. **Check dependency manifest** — understand what security-relevant libraries are already in use (auth libraries, crypto, validators).
5. **Search memory** — `memory_search("security auth [project] decision")` — retrieve prior threat model decisions or known constraints.
6. Improving security incrementally within the existing posture is safer than replacing it wholesale.

### Greenfield project

Security is cheapest to build in from the start — retrofitting it is expensive and error-prone:

1. **Do the threat model before writing any auth code** — answer: who are the actors, what are the assets, where are the trust boundaries, what are the realistic attack vectors. Write the answers down; they become the security spec.
2. **Choose auth approach once** — stateless token (no server state, harder to revoke) vs session (server state, easy revoke) vs platform credential (mobile/desktop keychain, OS identity). Pick based on deployment model and revocation requirements. Document it.
3. **Set secret management from day one** — environment variables as the minimum floor; a dedicated secrets store for any cloud or team deployment. Never commit credentials, connection strings, or API keys.
4. **Define input validation strategy** — validate at the boundary (API entry, UI input, file import), not deep inside business logic. Pick one validation approach and use it everywhere.
5. **Add dependency auditing to the build pipeline** — use the standard audit tool for the platform. Integrate it from the first CI run; bolt-on tooling after 100 dependencies is painful.
6. **Write security decisions into `CLAUDE.md`** — auth approach, token lifetimes, where secrets live, validation approach. Makes them explicit and non-negotiable for all contributors.
7. **Store the decisions:**
   ```
   memory_store("decision", "security: auth=[x], secrets=[x], validation=[x], dependency audit=[x]", ["security", "auth", "conventions"])
   ```

## When to activate

- Designing an authentication or authorization system
- Deciding what data to store and how to protect it
- Reviewing a public API surface for abuse vectors
- Evaluating third-party dependencies for supply chain risk
- Choosing between security architecture patterns (JWT vs session, OAuth flows, mTLS vs API keys)

## Protocol

### 1. Threat model first

Before any implementation:
- Who are the actors? (users, admins, external services, attackers)
- What are the assets? (data, compute, credentials, reputation)
- What are the trust boundaries? (where does trust change — network edge, service boundary, user input)
- For each boundary: what happens if an attacker controls the input?

### 2. Auth boundary checklist

- [ ] Authentication: who are you? (identity)
- [ ] Authorization: what are you allowed to do? (permissions)
- [ ] Token lifecycle: expiry, revocation, refresh strategy
- [ ] Credential storage: never in code, env vars minimum, secrets manager preferred
- [ ] Session fixation, CSRF, replay attack vectors identified

### 3. Input validation strategy

All external input is untrusted until validated:
- Validate at the boundary (API layer), not deep inside
- Reject unknown fields (allowlist, not denylist)
- Parameterize all queries — no string interpolation into SQL/shell/HTML
- File uploads: type, size, content validation; never execute uploaded content

### 4. Dependency risk

- Check for known CVEs before adding a new dependency
- Prefer narrow-scope packages over large frameworks when possible
- Pin versions in production; audit lock file changes in PRs
- Never auto-update production dependencies without review

### 5. Secret management

- No secrets in source code, logs, error messages, or URLs
- Rotate credentials on any suspected exposure
- Use short-lived tokens where possible
- Audit who has access to production secrets

## Output format

For each finding, state:
- **Risk**: what could go wrong
- **Likelihood**: low / medium / high given the context
- **Impact**: what is the consequence
- **Fix**: concrete recommendation (not just "validate input" — specific to the code)
