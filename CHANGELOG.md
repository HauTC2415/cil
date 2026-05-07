# Changelog

All notable changes to `@hautc/cil` will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

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
- Global install: `npm install -g @hautc/cil`

### Inspired by

- [context-mode](https://github.com/mksglu/context-mode) — hook-based session persistence, FTS5 retrieval
- [pro-workflow](https://github.com/rohitg00/pro-workflow) — workflow lifecycle, bounded agents
- [caveman](https://github.com/JuliusBrussee/caveman) — brevity philosophy, intensity tiers
- [RTK](https://github.com/rtk-ai/rtk) — transparent hook-based compression
- [Andrej Karpathy Skills](https://github.com/forrestchang/andrej-karpathy-skills) — assumption surfacing, verification checkpoints
