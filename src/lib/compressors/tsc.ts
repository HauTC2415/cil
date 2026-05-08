// TypeScript compiler errors — group identical error codes per file
// so a wall of repeated TS2322 across one file collapses to one summary line.

import { compressGeneric, type CompressionMode } from './generic.js';

export function compressTsc(raw: string, maxLines = 150, mode: CompressionMode = 'full'): string {
  const lines = raw.split('\n');
  // Match either of the two common tsc error formats:
  //   src/foo.ts(12,3): error TS2322: ...
  //   src/foo.ts:12:3 - error TS2322: ...
  const errRe1 = /^(.+\.tsx?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s*(.*)$/;
  const errRe2 = /^(.+\.tsx?):(\d+):(\d+)\s+-\s+error\s+(TS\d+):\s*(.*)$/;

  // file -> code -> count
  const groups = new Map<string, Map<string, number>>();
  const passthrough: string[] = [];

  for (const line of lines) {
    const m = errRe1.exec(line) ?? errRe2.exec(line);
    if (m) {
      const file = m[1]!;
      const code = m[4]!;
      let perFile = groups.get(file);
      if (!perFile) {
        perFile = new Map();
        groups.set(file, perFile);
      }
      perFile.set(code, (perFile.get(code) ?? 0) + 1);
      // Keep the first occurrence of each (file, code) so the user still sees
      // the message; the rest are summarized.
      if (perFile.get(code) === 1) passthrough.push(line);
      continue;
    }
    passthrough.push(line);
  }

  // Append a per-file summary if any error appeared more than once. The count
  // shown is `additional` occurrences beyond the first (which was kept above).
  const summaryLines: string[] = [];
  for (const [file, codes] of groups) {
    const repeats = [...codes.entries()].filter(([, n]) => n > 1);
    if (repeats.length > 0) {
      const repeatText = repeats.map(([c, n]) => `${c}×${n - 1}`).join(', ');
      summaryLines.push(`(${file}: ${repeatText} additional)`);
    }
  }

  return compressGeneric(
    [...passthrough, ...summaryLines].join('\n'),
    maxLines,
    mode,
  );
}
