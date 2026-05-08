---
description: Review the working diff (unstaged + staged) against a correctness, regressions, security, performance, and style checklist.
allowed-tools: Bash(git diff:*), Bash(git status:*), Read, Grep, Glob
---

# /review

Review current changes for correctness, regressions, and quality.

---

## Step 1 — Get the diff

```bash
git diff HEAD
# or for staged:
git diff --staged
```

If no git context, ask which files to review.

---

## Step 2 — Per-file checklist

For each changed file:

**Correctness**
- Does it do what it claims?
- Are edge cases handled (null, empty, boundary)?
- Is error handling appropriate?

**Regressions**
- Does it preserve existing behavior?
- Are tests updated to reflect changes?
- Any implicit contracts broken?

**Security**
- Unvalidated user input entering SQL/shell/eval?
- Secrets or credentials exposed?
- Auth/authz checks missing?

**Performance**
- N+1 queries? Blocking calls in hot paths?
- Unbounded loops or allocations?

**Style**
- Consistent with surrounding code?
- Names clear and accurate?
- No unnecessary comments or dead code?

---

## Step 3 — Report

**If issues found**: numbered list with severity.
- Critical: must fix before merge
- Major: should fix, blocks ship
- Minor: suggestion, non-blocking

**If clean**: "Review passed. Ready to commit."

Store review outcome: `memory_store("learning", "[what was caught in review]", ["review"])`
