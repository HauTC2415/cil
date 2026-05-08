// npm install/test — collapse repeated deprecation warnings and noisy http logs.

import { compressGeneric, type CompressionMode } from './generic.js';

export function compressNpm(raw: string, maxLines = 150, mode: CompressionMode = 'full'): string {
  const seen = new Set<string>();
  let dedupedDeprecations = 0;

  const filtered = raw.split('\n').filter((l) => {
    const m = l.match(/^npm\s+WARN\s+deprecated\s+(\S+)/);
    if (m) {
      const pkg = m[1]!;
      if (seen.has(pkg)) {
        dedupedDeprecations++;
        return false;
      }
      seen.add(pkg);
    }
    return true;
  });

  if (dedupedDeprecations > 0) {
    filtered.push(`(suppressed ${dedupedDeprecations} duplicate deprecation warning(s))`);
  }

  return compressGeneric(filtered.join('\n'), maxLines, mode);
}
