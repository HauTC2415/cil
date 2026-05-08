---
description: Project-local release pipeline — bump version, regenerate CHANGELOG from commits since last tag, update README docs for new features (with concrete examples + argument explanations), commit + tag + push, open a PR if on a non-main branch, then hand off a manual npm publish (no token configured yet).
argument-hint: <patch|minor|major|x.y.z>
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git tag:*), Bash(git rev-parse:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh auth status:*), Bash(npm version:*), Bash(npm test:*), Bash(npm run build:*), Bash(npm pack:*), Bash(node -p:*)
---

# /release

Bump version, refresh CHANGELOG + README, stage commit/tag, hand off manual `npm publish` to the user.

Argument `$ARGUMENTS` is one of:
- `patch` / `minor` / `major` — semver bump from current `package.json` version
- `x.y.z` — explicit version (e.g. `1.2.0`)
- empty — ask user

**Stop and ask the user at every checkpoint marked 🛑.** Never run `npm publish` — that is the user's call. `git push` and PR creation are done by `/release` itself, but only after explicit user confirmation at the corresponding 🛑.

---

## Step 1 — Pre-flight

Run in parallel:

```bash
git status --porcelain
git rev-parse --abbrev-ref HEAD
node -p "require('./package.json').version"
git describe --tags --abbrev=0 2>&1 || echo "NO_TAG"
```

Block release if:
- working tree dirty → ask user to commit/stash first
- branch ≠ `main` → confirm with user before proceeding
- last tag missing → treat all commits as the changelog window

🛑 **Verify** with user: current version `X.Y.Z`, last tag `vX.Y.Z`, branch `main`, tree clean.

---

## Step 2 — Decide new version

| `$ARGUMENTS` | Action |
|---|---|
| `patch` | bump Z (e.g. 1.1.0 → 1.1.1) |
| `minor` | bump Y, reset Z (e.g. 1.1.0 → 1.2.0) |
| `major` | bump X, reset Y/Z (e.g. 1.1.0 → 2.0.0) |
| `x.y.z` | use exactly |
| empty | inspect commits (Step 3) and recommend |

**Recommendation rule** (when arg is empty):
- any `feat:` commit → `minor`
- only `fix:` / `chore:` / `docs:` / `refactor:` → `patch`
- any `BREAKING CHANGE:` footer or `feat!:` → `major`

🛑 Confirm new version with user before continuing.

---

## Step 3 — Collect commits since last tag

```bash
git log <last-tag>..HEAD --pretty=format:"%h %s"
```

If empty → bail: "Nothing to release since `<last-tag>`."

Classify each commit by conventional prefix into buckets:

| Prefix | CHANGELOG section |
|---|---|
| `feat:` / `feat(...):` | **Added** |
| `fix:` / `fix(...):` | **Fixed** |
| `refactor:` / `perf:` | **Changed** |
| `revert:` / removal feat | **Removed** |
| `docs:` / `chore:` / `test:` / `ci:` / `build:` | skip (unless user-visible) |

Rephrase for end users — don't paste raw commit subjects. Example:
- raw: `feat(compress): add ultra mode for npm test`
- changelog: `npm test output now compressible via cil compress --mode=ultra (~95% reduction)`

---

## Step 4 — Update CHANGELOG.md

Read `CHANGELOG.md`. Insert a new section **directly after the top horizontal rule** (`---`) and **before the previous version block**:

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added
- <bullet>

### Fixed
- <bullet>

### Changed
- <bullet>
```

Today's date: use the `currentDate` in conversation context (do NOT shell out for it). Format `YYYY-MM-DD`.

Skip empty subsections. Use Edit tool with the existing file structure as anchor (insert under the `---` separator at top).

🛑 Show the user the new section. Wait for "ok" before continuing.

---

## Step 5 — Update README.md for new features

For each `feat:` commit in this release window, ask: **does this feature need user-facing docs in README?**

A feature needs README docs when it adds/changes any of:
- a slash command
- a `cil <subcommand>` CLI
- a `--flag` on an existing command
- an MCP tool
- a compressor / detector (update the table in Output Compression section)
- behavior the user can observe (hooks, env vars, file paths)

For each one that does, produce a documentation block that **must contain**:

1. **Heading** matching the existing README style:
   - new slash command → `### /<name> <arg-hint>` under the "Slash Commands" section
   - new CLI command → row in the "CLI Reference" table
   - new flag → update existing example, plus a short bullet under that section
   - new compressor → row in the compression table + 1 sentence in the per-tool dispatch paragraph

2. **One-sentence "what & why"** — what it does, why it exists. No fluff.

3. **A concrete example** in a code block. Must be runnable as-shown — no `<placeholder>` strings unless the placeholder is the literal user input.

4. **Arguments/flags table or bullets** — every argument and every flag listed with:
   - name
   - whether required/optional
   - allowed values (if a fixed set)
   - default (if optional with default)
   - 1-sentence meaning

   Skip the table only if the feature has zero arguments.

**Style anchor**: mirror `### /spec <feature>` and `### /develop <task>` in the existing README — short prose paragraph, single fenced code example, occasional bullet list. Do not invent new section conventions.

Apply each block with the Edit tool against `README.md`. After all edits:

🛑 Show the user a unified diff of README changes (`git diff README.md`). Wait for approval.

If user requests revisions: edit and re-diff. Do not move on with stale README.

---

## Step 6 — Bump version

```bash
npm version X.Y.Z --no-git-tag-version
```

`--no-git-tag-version` is required — we tag manually after the commit so CHANGELOG + README + version bump land in **one** commit.

This updates `package.json` and `package-lock.json`. Do not edit those files by hand.

---

## Step 7 — Verify build is green

Run sequentially (later steps depend on `dist/`):

```bash
npm run build
npm test
npm pack --dry-run
```

If any fails → stop, surface the error, do **not** continue. The user must fix before retrying `/release`.

`npm pack --dry-run` should show only files declared in `package.json` `files` whitelist (`dist/`, `templates/`, `README.md`, `LICENSE`). Flag if anything unexpected appears (e.g. `ROADMAP.local.md`, `.env`, source maps).

---

## Step 8 — Commit + tag

```bash
git add CHANGELOG.md README.md package.json package-lock.json
git commit -m "chore(release): vX.Y.Z"
git tag vX.Y.Z
```

🛑 Confirm before creating the tag — tags are easy to delete locally but messy to retract once pushed.

---

## Step 9 — Push commit + tag

Capture the current branch (already obtained in Step 1) and push both the branch and the new tag to `origin`:

```bash
git push origin <current-branch>
git push origin vX.Y.Z
```

🛑 Confirm before pushing. If the branch has no upstream yet, use `git push -u origin <current-branch>`.

If `<current-branch> == main`, **do not** force-push under any circumstance. If the push is rejected (non-fast-forward), stop and surface the error — never resolve it with `--force`.

---

## Step 10 — Open PR (only when not on `main`)

If `<current-branch> == main` → **skip this step entirely**, the release commit already lives on `main`.

Otherwise, open a PR from `<current-branch>` into `main`:

1. Verify `gh` is authenticated:

   ```bash
   gh auth status
   ```

   If not authenticated, stop and ask the user to run `gh auth login` themselves.

2. Check whether a PR already exists for this branch:

   ```bash
   gh pr view <current-branch> --json number,url 2>&1 || echo "NO_PR"
   ```

   - If a PR exists → print its URL and skip creation.
   - If `NO_PR` → create one:

     ```bash
     gh pr create --base main --head <current-branch> --title "chore(release): vX.Y.Z" --body "$(cat <<'EOF'
     ## Release vX.Y.Z

     Bumps version, regenerates CHANGELOG, and refreshes README docs for new user-facing features.

     See `CHANGELOG.md` for the full release notes.
     EOF
     )"
     ```

🛑 Show the user the proposed PR title + body before running `gh pr create`. Print the resulting PR URL.

---

## Step 11 — Hand off manual `npm publish`

`NPM_TOKEN` is not configured in the repo, so the auto-publish workflow is disabled. Print the exact command sequence for the user to run **themselves** in their own terminal:

```bash
# 1. (one-time) authenticate with npm
npm login

# 2. publish — runs prepublishOnly (npm run build) automatically
npm publish --access public
```

Do **not** execute these steps. Just print the block and report:

> Release `vX.Y.Z` prepared. Commit `<short-sha>` and tag `vX.Y.Z` pushed to `origin/<current-branch>`. <PR URL, if one was created or already existed>. Run the commands above when ready to publish to npm.

---

## Notes for the assistant

- Today's date comes from the `currentDate` field already injected into the conversation context — use it directly, don't `Get-Date` / `date`.
- The CHANGELOG entry text is for **users**, not for git history. Rephrase commit subjects into outcomes.
- If `git log` shows no `feat:` and no `fix:` commits, the only honest changelog is `### Changed` or `### Internal` — never invent features.
- Never `--amend` an existing release commit; if the user wants a fix, run `/release patch` again on top.
- If `npm pack --dry-run` shows unexpected files, the fix is the `files` whitelist in `package.json`, not a `.npmignore`.
