// RTK-style 4-pillar output compression
// Inspired by github.com/rtk-ai/rtk

const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;

// Commands known to produce verbose output — worth compressing
const VERBOSE_PATTERNS = [
  /^git\s+(diff|log|show|blame|stash\s+show)/,
  /^npm\s+(install|ci|test|run|audit)/,
  /^(pytest|python|python3)\s/,
  /^node\s/,
  /^(docker|kubectl)\s/,
  /^(cargo|go\s+build|go\s+test)/,
  /^cat\s.+\.(log|txt|json|yaml|yml|lock)/,
  /^find\s/,
  /^ls\s+-[lRa]/,
];

export function isVerboseCommand(command: string): boolean {
  const trimmed = command.trim();
  return VERBOSE_PATTERNS.some((p) => p.test(trimmed));
}

export function compress(raw: string, maxLines = 150): string {
  if (!raw.trim()) return raw;

  // Pillar 1: Filter — strip ANSI, remove pure noise
  let lines = raw
    .replace(ANSI_RE, '')
    .split('\n')
    .filter((l) => !isNoiseLine(l));

  // Pillar 2: Deduplicate — collapse identical consecutive lines
  lines = deduplicateConsecutive(lines);

  // Pillar 3: Group — collapse similar lines (same prefix, varies at end)
  lines = groupSimilar(lines);

  // Pillar 4: Truncate — keep head + tail if too long
  lines = truncate(lines, maxLines);

  const result = lines.join('\n');
  const ratio = raw.length > 0 ? Math.round((1 - result.length / raw.length) * 100) : 0;

  if (ratio > 10) {
    return result + `\n\n[compressed ${ratio}% — ${raw.split('\n').length} → ${lines.length} lines]`;
  }
  return result;
}

function isNoiseLine(line: string): boolean {
  const t = line.trim();
  if (t === '') return true;

  // npm progress bars and spinners
  if (/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/.test(t)) return true;
  if (/^\s*[\|/\-\\]\s*$/.test(t)) return true;

  // npm timing/telemetry
  if (t.startsWith('npm timing') || t.startsWith('npm verb')) return true;

  // Pure separator lines
  if (/^[-=_*]{5,}$/.test(t)) return true;

  return false;
}

function deduplicateConsecutive(lines: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    let count = 1;
    while (i + count < lines.length && lines[i + count] === lines[i]) {
      count++;
    }
    if (count > 1) {
      result.push(`${lines[i]} (×${count})`);
    } else {
      result.push(lines[i]!);
    }
    i += count;
  }

  return result;
}

function groupSimilar(lines: string[]): string[] {
  // Group "warning: X" × N, "error: X" × N, etc.
  const result: string[] = [];
  const groups = new Map<string, number>();

  for (const line of lines) {
    const prefix = getSimilarityPrefix(line);
    if (prefix) {
      groups.set(prefix, (groups.get(prefix) ?? 0) + 1);
    } else {
      // Flush any accumulated group
      flushGroups(result, groups);
      result.push(line);
    }
  }

  flushGroups(result, groups);
  return result;
}

function getSimilarityPrefix(line: string): string | null {
  // Lines like "warning: ...", "note: ...", "  at ..." (stack frames)
  const warningMatch = line.match(/^(warning|note|hint|info):\s+/i);
  if (warningMatch) return warningMatch[0]!;

  const stackMatch = line.match(/^\s+at\s+/);
  if (stackMatch) return '__stack__';

  return null;
}

function flushGroups(result: string[], groups: Map<string, number>): void {
  for (const [prefix, count] of groups) {
    if (prefix === '__stack__') {
      result.push(`  ... ${count} stack frame(s)`);
    } else {
      result.push(`${prefix}... (${count} messages)`);
    }
  }
  groups.clear();
}

function truncate(lines: string[], max: number): string[] {
  if (lines.length <= max) return lines;

  const head = Math.floor(max * 0.6);
  const tail = Math.floor(max * 0.4);
  const omitted = lines.length - head - tail;

  return [
    ...lines.slice(0, head),
    `... [${omitted} lines omitted] ...`,
    ...lines.slice(lines.length - tail),
  ];
}
