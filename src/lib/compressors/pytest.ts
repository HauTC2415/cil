// pytest — keep failure detail; drop verbose pass output in ultra mode.

import { compressGeneric, type CompressionMode } from './generic.js';

export function compressPytest(raw: string, maxLines = 150, mode: CompressionMode = 'full'): string {
  if (mode !== 'ultra') {
    return compressGeneric(raw, maxLines, mode);
  }

  // Ultra: keep summary, FAILED section, and short-test-summary; drop pass details.
  const lines = raw.split('\n');
  const out: string[] = [];
  let inFailures = false;
  let inSummary = false;

  for (const line of lines) {
    if (/^=+\s*FAILURES\s*=+/.test(line)) {
      inFailures = true;
      out.push(line);
      continue;
    }
    if (/^=+\s*short test summary info\s*=+/i.test(line)) {
      inFailures = false;
      inSummary = true;
      out.push(line);
      continue;
    }
    if (/^=+\s*\d+\s+(passed|failed|error)/i.test(line)) {
      inSummary = true;
      out.push(line);
      continue;
    }
    if (inFailures || inSummary) {
      out.push(line);
      continue;
    }
    // Outside failure/summary: drop per-test PASSED noise; keep file-level lines.
    // Common forms:
    //   test_x.py::test_name PASSED
    //   test_x.py::test_name PASSED        [ 50%]
    //   test_x.py ... ok
    if (/\bPASSED\b(\s+\[\s*\d+%\])?\s*$/.test(line)) continue;
    if (/\.\.\.\s+ok\s*$/.test(line)) continue;
    out.push(line);
  }

  return compressGeneric(out.join('\n'), maxLines, mode);
}
