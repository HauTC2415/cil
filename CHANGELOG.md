# Changelog

All notable changes to `@hautc.it/cil` will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [2.2.0] — 2026-05-12

### Added

- **`database-design` skill** — design schemas from scratch: entity modeling, normalization (3NF vs denorm), indexing strategy (composite index order, FTS5/GIN), SQL vs NoSQL decision matrix, schema evolution plan; auto-loaded by Claude Code when the topic is database design
- **`security` skill** — design-time security guidance covering threat modeling, trust boundaries, auth boundary checklist (authentication, authorization, token lifecycle), input validation strategy, dependency risk assessment, and secret management; complements Claude Code's built-in `/security-review` code scan
- **`/handoff` workflow** — fast session handover when context is filling up; captures in-progress state (git status, active task, next action) and generates a paste-ready resume command for the next session; lighter than `/wrap-up` (no full audit checklist)
- **`/onboard` workflow** — structured codebase orientation before modifying unfamiliar code; reads `CLAUDE.md`, maps entry points and test layout, audits conventions, reviews recent git activity, and retrieves prior memory about the project

### Changed

- Improved content in `api-design`, `migration`, and `testing` skills
- README slash-commands table updated to list all 11 installed workflows (was 8)
- Removed 3 dead internal exports: `isVerboseCommand`, `CONFIG_PATH`, `listWorkflows`/`listSkills`

---

## [2.1.0] — 2026-05-12

### Added

- `cil upgrade` now checks the npm registry for newer versions and automatically runs `npm install -g @hautc.it/cil@latest` when an update is available — no manual reinstall needed
- `cil upgrade --check` previews both the npm update and template diff without applying either

### Changed

- README fully updated: added Skills section (api-design, migration), Hooks section documenting all 5 hooks including Correction Memory (UserPromptSubmit), full CLI Reference with `cil upgrade`, `cil uninstall`, and all command flags

---

## [2.0.1] — 2026-05-12

### Fixed

- `cil --version` now reads version from `package.json` at runtime instead of being hardcoded
- Test runner (`vitest`) downgraded from v4 to v3 to restore compatibility with Node.js 20.8.x (v4 requires Node ≥ 20.12.0 due to `rolldown` dependency)

---

## [1.1.0] — 2026-05-07

### Added

- GitHub Actions CI workflow (`ci.yml`): typecheck + build on push/PR to main, matrix Node 20 & 22
- Auto-publish workflow (`publish.yml`): triggers on `v*` tags via `NPM_TOKEN` secret (currently disabled — enable after adding secret)

### Fixed

- `PreToolUse` hook now correctly includes `matcher: "Bash"` in settings
- Explicit `cil compress` instruction added to CLAUDE.md as reliable compression fallback
- Package name corrected to `@hautc.it/cil` throughout

---

## [1.0.1] — 2026-05-07

### Fixed

- Package scoped name updated to `@hautc.it/cil` (npm username)
- MCP server registered at user scope for cross-project availability

---

## [1.0.0] — 2026-05-07

### Added

- `cil init` — initialize CIL in any project (CLAUDE.md, workflows, hooks, MCP)
- `cil doctor` — validate installation status
- `cil compact` — print context snapshot from memory
- `cil retrieve` — FTS5 full-text search over stored memories
- `cil reset` — clear memory database
- MCP server with 4 tools: `memory_store`, `memory_search`, `session_snapshot`, `session_restore`
- SQLite FTS5 memory engine with BM25 ranking and Porter stemming
- Hook system: `PostToolUse`, `PreCompact`, `Stop` — automatic context continuity
- 6 slash commands: `/develop`, `/review`, `/commit`, `/wrap-up`, `/learn`, `/retrieve`
- 4 engineering skills: debugging, testing, architecture, performance
- 4 agent templates: planner, researcher, reviewer, implementer
- CLAUDE.md template combining caveman + karpathy principles
- Session snapshot: ≤2KB state preserved across context compactions
- Cross-platform support: Windows, macOS, Linux
- Global install: `npm install -g @hautc.it/cil`

### Inspired by

- [context-mode](https://github.com/mksglu/context-mode) — hook-based session persistence, FTS5 retrieval
- [pro-workflow](https://github.com/rohitg00/pro-workflow) — workflow lifecycle, bounded agents
- [caveman](https://github.com/JuliusBrussee/caveman) — brevity philosophy, intensity tiers
- [RTK](https://github.com/rtk-ai/rtk) — transparent hook-based compression
- [Andrej Karpathy Skills](https://github.com/forrestchang/andrej-karpathy-skills) — assumption surfacing, verification checkpoints
