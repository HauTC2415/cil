// cargo build/test/check — drop "Compiling crate vN.N" noise; keep warnings/errors.

import { compressGeneric, type CompressionMode } from './generic.js';

export function compressCargo(raw: string, maxLines = 150, mode: CompressionMode = 'full'): string {
  const lines = raw.split('\n');
  const kept: string[] = [];
  let compiledCount = 0;

  for (const line of lines) {
    // "   Compiling foo v0.1.2" / "   Compiling foo v0.1.2 (path)"
    if (/^\s+Compiling\s+\S+\s+v[\d.]/.test(line)) {
      compiledCount++;
      continue;
    }
    // "   Checking foo v0.1.2"
    if (/^\s+Checking\s+\S+\s+v[\d.]/.test(line)) {
      compiledCount++;
      continue;
    }
    // "  Downloaded foo v0.1.2"
    if (/^\s+Downloaded\s+\S+\s+v[\d.]/.test(line)) continue;
    // "  Updating crates.io index"
    if (/^\s+Updating\s+crates\.io/.test(line)) continue;
    // "    Blocking waiting for file lock"
    if (/^\s+Blocking\s+waiting/.test(line)) continue;

    kept.push(line);
  }

  if (compiledCount > 0) {
    // Insert a single summary line at the top (most cargo runs end with Finished anyway)
    kept.unshift(`(compiled/checked ${compiledCount} crate(s))`);
  }

  return compressGeneric(kept.join('\n'), maxLines, mode);
}
