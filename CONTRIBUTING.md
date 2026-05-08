# Contributing to CIL

## Setup

```bash
git clone git@github.com:HauTC2415/cil.git
cd cil
npm install
npm run build
npm link   # makes `cil` available globally for testing
```

Verify everything is wired up:

```bash
npm test                  # vitest, ~130 tests
npm run sync-templates    # checks templates/workflows ↔ .claude/commands
npm run benchmark         # measures compressor reduction %
cil doctor                # runtime self-check
```

## Project structure

```
src/
  index.ts          — CLI entry (commander)
  commands/         — init, doctor, compact, retrieve, reset, hook,
                      compress, export, import, prune
  lib/              — db, paths, claude config, template installer,
                      compress dispatcher + per-tool compressors,
                      correction-detector
  mcp/index.ts      — MCP server (4 tools)

templates/
  claude/CLAUDE.md       — engineering principles template
  workflows/<name>.md    — slash command templates (auto-discovered via frontmatter)
  skills/<name>/SKILL.md — cognitive heuristics (auto-loaded via frontmatter)
  agents/<name>.md       — agent role templates (auto-routed via frontmatter)

scripts/
  sync-templates.mjs — drift check between templates/workflows and .claude/commands
  benchmark.mjs      — compression % per tool
```

## Making changes

1. Edit TypeScript in `src/`
2. `npm run build` to compile
3. `npm test` — every bug fix ships with a test that would have caught it
4. `cil doctor` to verify installation
5. Test the changed command manually

## Adding a workflow (slash command)

1. Create `templates/workflows/<name>.md` with YAML frontmatter:

   ```markdown
   ---
   description: One-line summary shown in the slash command picker.
   argument-hint: <expected argument shape>
   ---
   ```

   Add `allowed-tools:` if the command should have a restricted tool set (see `commit.md`).

2. Run `npm run sync-templates:apply` to copy into `.claude/commands/`. CI fails if drift is uncommitted.

3. Users invoke it as `/<name>` in Claude Code.

**Project-local commands** (only useful inside this repo, e.g. `/release`) live under `.claude/commands/<name>.md` directly and are added to the `LOCAL_ONLY` set in `scripts/sync-templates.mjs` so they don't ship via `cil init`.

## Adding a skill

1. Create `templates/skills/<name>/SKILL.md` (folder + file — Claude Code's expected layout).

2. Frontmatter is required for auto-load:

   ```markdown
   ---
   name: <name>
   description: Use when <trigger condition>. <one-line value>.
   ---
   ```

3. Keep it under ~50 lines — concise heuristics, not implementation code. Reasoning patterns only.

## Adding an agent

1. Create `templates/agents/<name>.md` with frontmatter:

   ```markdown
   ---
   name: <name>
   description: Use when <trigger>. <one-line scope>.
   tools: Read, Grep, Glob, Bash
   ---
   ```

   `tools:` restricts what the subagent can call. Researcher-style agents typically omit `Edit`/`Write`.

2. Body describes the agent's protocol — what it reads, what it produces, what it explicitly does not do.

## Submitting changes

- Open an issue first for significant changes
- PRs should include: what changed, why, how to test
- Keep commits atomic and conventional (`feat:`, `fix:`, `docs:`, `chore:`...)
- Run `npm test` and `npm run sync-templates` before pushing

## Principles

- Less is more. Don't add features that aren't needed.
- Token efficiency matters. Every byte in templates costs users.
- Silent-fail hooks. Never block Claude Code from starting.
- Single source of truth. Don't duplicate instructions.
- Don't reinvent Claude Code wheels (skills, subagents, worktree, security-review, simplify).
