---
description: Structured codebase orientation — understand an unfamiliar project before making changes. Maps architecture, conventions, entry points, and gotchas.
---

# /onboard

Structured orientation for an unfamiliar codebase. Run this before making changes to any project
you haven't worked in before (or haven't touched in a while).

---

## Step 1 — Project identity

Read:
- `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` — name, version, scripts
- `README.md` — stated purpose, install, quick-start
- `CLAUDE.md` — project-specific AI instructions (highest priority)

Answer: What does this project do? Who is the primary user?

---

## Step 2 — Codebase map

```bash
find . -maxdepth 3 -type f \( -name "*.ts" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) \
  | grep -v node_modules | grep -v dist | grep -v .git | head -60
```

Identify:
- Entry point(s) — where execution starts
- Core modules — what the main packages/directories do
- Config surface — env vars, config files, feature flags
- Test layout — where tests live, how to run them

---

## Step 3 — Conventions audit

Check for:
- Linting / formatting config (`.eslintrc`, `ruff.toml`, `.prettierrc`)
- Type checking (`tsconfig.json`, `mypy.ini`, `pyright`)
- Git hooks (`.husky/`, `.pre-commit-config.yaml`)
- CI pipeline (`.github/workflows/`, `.gitlab-ci.yml`)

Note any rules that will affect your work (strict null checks, import order, etc.)

---

## Step 4 — Recent changes

```bash
git log --oneline -20
git diff HEAD~5..HEAD --stat
```

What has changed recently? Any migrations in progress? Flags being ramped?

---

## Step 5 — Search memory for prior context

```
memory_search("[project name or key technology]")
```

Have you worked in this project before? Retrieve prior decisions and constraints.

---

## Step 6 — Store orientation summary

```
memory_store("architecture", "[project name]: [1–2 sentence architecture summary]", ["onboarding", "architecture"])
memory_store("constraint", "[any hard constraint discovered]", ["constraint", "project"])
```

---

## Step 7 — State assumptions explicitly

List 3–5 assumptions you are making about this codebase before writing any code.
These become checkpoints — verify them during implementation.
