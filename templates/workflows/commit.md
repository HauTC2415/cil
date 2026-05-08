---
description: Generate a conventional commit message for staged changes (feat/fix/refactor/...) and run git commit. Refuses if sensitive files are staged.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git log:*)
---

# /commit

Generate and run a commit for staged changes.

---

## Step 1 — Inspect

```bash
git diff --staged
git status
```

Check nothing sensitive is staged: `.env`, API keys, large binaries, generated files.
If anything suspicious: warn and stop.

---

## Step 2 — Analyze

What changed? Identify:
- Type: feat | fix | refactor | docs | test | chore | perf
- Scope: affected module or area (optional)
- What it adds/fixes/removes — the WHY, not the WHAT

---

## Step 3 — Draft message

Format:
```
<type>(<scope>): <short description under 72 chars>

<body — only if the why is non-obvious>
```

Examples:
```
feat(auth): add OAuth2 login with Google provider

fix(api): return 404 instead of 500 for missing users

refactor(db): extract query builder to reduce duplication
```

---

## Step 4 — Commit

```bash
git commit -m "<message>"
```

If pre-commit hook fails: fix the issue, re-stage, create new commit (never --no-verify).

Report: "Committed: [message]"
