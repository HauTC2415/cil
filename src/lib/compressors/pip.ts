// pip install — dedupe "Requirement already satisfied" and collapse Collecting noise.

import { compressGeneric, type CompressionMode } from './generic.js';

export function compressPip(raw: string, maxLines = 150, mode: CompressionMode = 'full'): string {
  const lines = raw.split('\n');
  const out: string[] = [];
  let alreadySatisfied = 0;
  let collecting = 0;
  let downloading = 0;

  const flush = (): void => {
    if (alreadySatisfied > 0) {
      out.push(`(${alreadySatisfied} requirement(s) already satisfied)`);
      alreadySatisfied = 0;
    }
    if (collecting > 0) {
      out.push(`(collecting ${collecting} package(s))`);
      collecting = 0;
    }
    if (downloading > 0) {
      out.push(`(downloading ${downloading} archive(s))`);
      downloading = 0;
    }
  };

  for (const line of lines) {
    if (/^Requirement already satisfied:/.test(line)) {
      alreadySatisfied++;
      continue;
    }
    if (/^Collecting\s+\S+/.test(line)) {
      collecting++;
      continue;
    }
    if (/^\s*Downloading\s+\S+\.(whl|tar\.gz|zip)/.test(line)) {
      downloading++;
      continue;
    }
    // Pure progress bars like "  |████████| 1.2 MB"
    if (/^\s*\|[█\s]+\|/.test(line)) continue;
    // "  Using cached foo-1.2.3.whl (456 kB)"
    if (/^\s*Using cached\s+\S+\.(whl|tar\.gz|zip)/.test(line)) continue;

    flush();
    out.push(line);
  }
  flush();

  return compressGeneric(out.join('\n'), maxLines, mode);
}
