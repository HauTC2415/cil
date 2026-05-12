// Compression dispatcher — RTK-style per-tool filters with a generic fallback.
// Detects the tool that produced the output and routes to the appropriate
// compressor (git, npm, pytest, or generic 4-pillar).

import { compressGeneric, type CompressionMode } from './compressors/generic.js';
import { compressGit } from './compressors/git.js';
import { compressNpm } from './compressors/npm.js';
import { compressPytest } from './compressors/pytest.js';
import { compressDocker } from './compressors/docker.js';
import { compressCargo } from './compressors/cargo.js';
import { compressTsc } from './compressors/tsc.js';
import { compressPip } from './compressors/pip.js';

export type Tool = 'git' | 'npm' | 'pytest' | 'docker' | 'cargo' | 'tsc' | 'pip' | 'generic';
export type { CompressionMode };

// High-volume commands where ultra mode (semantic dedup of PASS lines, etc.)
// pays off — mostly test runners and package installers.
const ULTRA_PATTERNS = [
  /^(pytest|python\s+-m\s+pytest|python3\s+-m\s+pytest)\b/,
  /^npm\s+(test|run\s+test|run\s+test:)/,
  /^npm\s+(install|ci)\b/,
  /^(pip|pip3)\s+install/,
  /^cargo\s+(build|test|check)\b/,
  /^(jest|vitest|mocha)\b/,
  /^(go\s+test)\b/,
];

// Verbose commands that benefit from full pipeline (filter + dedupe + group +
// truncate) but where semantic dedup of PASS lines would be inappropriate.
const FULL_PATTERNS = [
  /^git\s+(diff|log|show|blame|stash\s+show)/,
  /^npm\s+(run|audit)/,
  /^docker\s+(build|pull|push|run|compose)/,
  /^kubectl\s/,
  /^cargo\s+(run|update|fetch)/,
  /^(tsc|npx\s+tsc)\b/,
  /^(go\s+build)\b/,
  /^cat\s.+\.(log|txt|json|yaml|yml|lock)/,
  /^find\s/,
  /^ls\s+-[lRa]/,
  /^(eslint|tsc|prettier|ruff|mypy|flake8|black)\b/,
  /^(make|mvn|gradle|bazel)\b/,
];

// Trivial commands with no meaningful output — wrapping them in compress
// only adds shell overhead.
const SAFE_NO_COMPRESS = [
  /^(cd|pwd|pushd|popd)\b/,
  /^(mkdir|rmdir|mv|cp|ln|chmod|chown|touch|rm)\b/,
  /^(export|unset|set|alias|source|\.)\b/,
  /^echo\s+\S{0,80}$/, // short single-arg echo
  /^:\s*$/,
  /^true\s*$/,
  /^false\s*$/,
];

// Choose compression mode for a Bash command. Returns 'skip' for trivial
// commands that shouldn't be wrapped at all, otherwise the appropriate mode.
// Default for any unknown command is 'lite' — safe (only filters ANSI/noise),
// no truncation, near-zero overhead for short outputs.
export function selectMode(command: string): CompressionMode | 'skip' {
  const t = command.trim();
  if (!t) return 'skip';
  if (SAFE_NO_COMPRESS.some((p) => p.test(t))) return 'skip';
  if (ULTRA_PATTERNS.some((p) => p.test(t))) return 'ultra';
  if (FULL_PATTERNS.some((p) => p.test(t))) return 'full';
  return 'lite';
}

// Heuristic detection from output content. Cheap — checks first ~200 lines.
// Order matters: more specific matches first (git/pytest have very distinctive
// markers; docker/pip/cargo can resemble generic build output).
export function detectTool(raw: string): Tool {
  const head = raw.split('\n', 200).join('\n');
  const firstLine = head.split('\n')[0] ?? '';

  if (/^diff --git\s/m.test(head) || /^commit\s+[0-9a-f]{7,40}/m.test(head)) {
    return 'git';
  }
  if (
    /^=+\s*test session starts\s*=+/im.test(head) ||
    /\bpytest\b/.test(firstLine) ||
    /^=+\s*\d+\s+(passed|failed|error)/m.test(head)
  ) {
    return 'pytest';
  }
  if (/^npm\s+(WARN|ERR!|notice|info|http)/m.test(head) || /^added\s+\d+\s+packages?/m.test(head)) {
    return 'npm';
  }
  if (/^Step\s+\d+\/\d+\s/m.test(head) || /^[\da-f]{12}:\s+(Pulling|Already|Pull|Extracting|Waiting)\b/m.test(head)) {
    return 'docker';
  }
  if (/^\s+(Compiling|Checking)\s+\S+\s+v[\d.]/m.test(head) || /^error\[E\d+\]:/m.test(head)) {
    return 'cargo';
  }
  if (/\.tsx?\(\d+,\d+\):\s+error\s+TS\d+:/m.test(head) || /\.tsx?:\d+:\d+\s+-\s+error\s+TS\d+:/m.test(head) || /^Found\s+\d+\s+errors?/m.test(head)) {
    return 'tsc';
  }
  if (/^Collecting\s+\S+/m.test(head) || /^Requirement already satisfied:/m.test(head)) {
    return 'pip';
  }

  return 'generic';
}

export function compress(
  raw: string,
  maxLines = 150,
  mode: CompressionMode = 'full',
  tool?: Tool,
): string {
  if (!raw.trim()) return raw;

  const t = tool ?? detectTool(raw);
  switch (t) {
    case 'git':    return compressGit(raw, maxLines, mode);
    case 'npm':    return compressNpm(raw, maxLines, mode);
    case 'pytest': return compressPytest(raw, maxLines, mode);
    case 'docker': return compressDocker(raw, maxLines, mode);
    case 'cargo':  return compressCargo(raw, maxLines, mode);
    case 'tsc':    return compressTsc(raw, maxLines, mode);
    case 'pip':    return compressPip(raw, maxLines, mode);
    default:       return compressGeneric(raw, maxLines, mode);
  }
}
