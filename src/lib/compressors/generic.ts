// Generic 4-pillar output compression — fallback when no tool-specific
// compressor matches. Preserves the original RTK-style behavior.

export type CompressionMode = 'lite' | 'full' | 'ultra';

const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;

export function compressGeneric(raw: string, maxLines = 150, mode: CompressionMode = 'full'): string {
  if (!raw.trim()) return raw;

  // Pillar 1: Filter — strip ANSI, remove pure noise (all modes)
  let lines = raw
    .replace(ANSI_RE, '')
    .split('\n')
    .filter((l) => !isNoiseLine(l));

  if (mode !== 'lite') {
    // Pillar 2: Deduplicate — collapse identical consecutive lines
    lines = deduplicateConsecutive(lines);

    // Pillar 3: Group — collapse similar lines (same prefix, varies at end)
    lines = groupSimilar(lines);

    // Pillar 4: Truncate — keep head + tail if too long
    lines = truncate(lines, maxLines);
  }

  if (mode === 'ultra') {
    lines = semanticDedup(lines);
  }

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

  // npm telemetry / verbose / silly / http-fetch noise
  if (/^npm\s+(timing|verb|sill|http\s+fetch|notice)/.test(t)) return true;

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
  const result: string[] = [];
  // For each prefix track the first original line + the running count, so a
  // singleton stays unchanged and only true repeats become a summary.
  const groups = new Map<string, { first: string; count: number }>();

  for (const line of lines) {
    const prefix = getSimilarityPrefix(line);
    if (prefix) {
      const existing = groups.get(prefix);
      if (existing) {
        existing.count++;
      } else {
        groups.set(prefix, { first: line, count: 1 });
      }
    } else {
      flushGroups(result, groups);
      result.push(line);
    }
  }

  flushGroups(result, groups);
  return result;
}

function getSimilarityPrefix(line: string): string | null {
  const warningMatch = line.match(/^(warning|note|hint|info):\s+/i);
  if (warningMatch) return warningMatch[0]!;

  const stackMatch = line.match(/^\s+at\s+/);
  if (stackMatch) return '__stack__';

  return null;
}

function flushGroups(result: string[], groups: Map<string, { first: string; count: number }>): void {
  for (const [prefix, info] of groups) {
    if (info.count === 1) {
      result.push(info.first);
      continue;
    }
    if (prefix === '__stack__') {
      result.push(`  ... ${info.count} stack frame(s)`);
    } else {
      result.push(`${prefix}... (${info.count} messages)`);
    }
  }
  groups.clear();
}

// Ultra mode: semantic-level reduction beyond surface dedup.
function semanticDedup(lines: string[]): string[] {
  const out: string[] = [];
  let passCount = 0;

  const flushPasses = (): void => {
    if (passCount > 0) {
      out.push(`✓ ${passCount} passing test(s)`);
      passCount = 0;
    }
  };

  for (const line of lines) {
    if (/^\s*(PASS\b|ok\b|✓|✔|PASSED\b)/i.test(line)) {
      passCount++;
      continue;
    }
    flushPasses();
    out.push(line);
  }
  flushPasses();
  return out;
}

function truncate(lines: string[], max: number): string[] {
  if (lines.length <= max + 5) return lines;

  const head = Math.floor(max * 0.6);
  const tail = Math.floor(max * 0.4);
  const omitted = lines.length - head - tail;

  return [
    ...lines.slice(0, head),
    `... [${omitted} lines omitted] ...`,
    ...lines.slice(lines.length - tail),
  ];
}
