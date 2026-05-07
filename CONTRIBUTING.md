# Contributing to CIL

## Setup

```bash
git clone git@github.com:HauTC2415/cil.git
cd cil
npm install
npm run build
npm link   # makes `cil` available globally for testing
```

## Project structure

```
src/
  index.ts          — CLI entry (commander)
  commands/         — init, doctor, compact, retrieve, reset, hook
  lib/              — db, paths, claude config, template installer
  mcp/index.ts      — MCP server (4 tools)

templates/
  claude/CLAUDE.md  — engineering principles template
  workflows/        — slash command templates (/develop, /review ...)
  skills/           — cognitive heuristics (debugging, testing ...)
  agents/           — agent role templates (planner, researcher ...)
```

## Making changes

1. Edit TypeScript in `src/`
2. `npm run build` to compile
3. `cil doctor` to verify installation
4. Test the changed command manually

## Adding a workflow

1. Create `templates/workflows/<name>.md`
2. It will be installed automatically by `cil init`
3. Users invoke it as `/<name>` in Claude Code

## Adding a skill

1. Create `templates/skills/<name>.md`
2. Keep it under 50 lines — concise heuristics only
3. No implementation code — reasoning patterns only

## Submitting changes

- Open an issue first for significant changes
- PRs should include: what changed, why, how to test
- Keep commits atomic and conventional (`feat:`, `fix:`, `docs:`)

## Principles

- Less is more. Don't add features that aren't needed.
- Token efficiency matters. Every byte in templates costs users.
- Silent-fail hooks. Never block Claude Code from starting.
- Single source of truth. Don't duplicate instructions.
