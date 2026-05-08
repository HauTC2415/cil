---
description: Detect project type (Node/Python/Rust/Go/mixed) and propose CLAUDE.md + settings.json additions for lint, typecheck, and test commands. Pure inspection — applies nothing without explicit user approval.
argument-hint: (no arguments)
---

# /auto-setup

Inspect the current project and propose configuration additions for the detected toolchain. **Apply nothing without user approval at the end.**

## Step 1 — Detect

Check for these manifests in the project root and immediate subdirectories:

- `package.json` → Node.js / TypeScript
- `pyproject.toml`, `setup.py`, `requirements.txt`, `Pipfile` → Python
- `Cargo.toml` → Rust
- `go.mod` → Go
- `pom.xml`, `build.gradle` → JVM
- Multiple of the above → Monorepo / mixed

For each detected stack, identify:
- Package manager (`npm`/`pnpm`/`yarn`/`poetry`/`pip`/`cargo`/`go`/etc.)
- Lint command (e.g. `npm run lint`, `ruff check`, `cargo clippy`, `golangci-lint run`)
- Typecheck command (e.g. `tsc --noEmit`, `mypy`, none for Rust/Go which check at build)
- Test command (e.g. `npm test`, `pytest`, `cargo test`, `go test ./...`)

Read the actual scripts from `package.json` / `pyproject.toml` / etc. — don't assume names exist.

## Step 2 — Propose CLAUDE.md additions

Show a diff block of what should be appended to the project's `CLAUDE.md` under a `## Project Toolchain` heading:

```markdown
## Project Toolchain

- **Stack:** <detected>
- **Lint:** `<command>`
- **Typecheck:** `<command>` (or "n/a — checked at build")
- **Test:** `<command>`
- **Run before commit:** `<lint && typecheck && test>`
```

## Step 3 — Propose settings.json additions

If the project has `.claude/settings.json`, show a diff block adding `permissions.allow` entries for the detected commands so they don't prompt every time:

```json
{
  "permissions": {
    "allow": [
      "Bash(<lint command>)",
      "Bash(<typecheck command>)",
      "Bash(<test command>)"
    ]
  }
}
```

## Step 4 — Present and wait for approval

Output a single message containing:
1. **Detected:** the stack(s) found and where (paths to manifests).
2. **Proposed CLAUDE.md addition:** the markdown diff block from Step 2.
3. **Proposed settings.json addition:** the JSON diff block from Step 3.
4. **Verification commands** to run after applying (e.g. `<lint command>` should exit 0 on a clean tree).
5. **Ask:** "Apply both changes? (yes / only CLAUDE.md / only settings.json / no)"

Apply only after explicit approval. If the user says no, store nothing and exit.

## Constraints

- **No silent edits.** Never modify CLAUDE.md or settings.json before approval.
- **Verify commands exist before proposing.** If `npm run lint` is in proposal, `package.json` must have a `lint` script. Otherwise propose installing or skip.
- **Don't overwrite existing sections.** If `## Project Toolchain` already exists in CLAUDE.md, show what would change and ask before replacing.
- **No new dependencies.** This command only documents and permissions what already exists.
