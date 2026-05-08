// git diff/log/show — drop low-signal metadata before generic compression.

import { compressGeneric, type CompressionMode } from './generic.js';

export function compressGit(raw: string, maxLines = 150, mode: CompressionMode = 'full'): string {
  // Drop lines that rarely help a reader:
  //   - "index abc1234..def5678 100644"  (hash refs)
  //   - "\ No newline at end of file"
  //   - mode/perm change boilerplate when content is shown
  const filtered = raw
    .split('\n')
    .filter((l) => {
      if (/^index\s+[0-9a-f]+\.\.[0-9a-f]+(\s+\d+)?$/i.test(l)) return false;
      if (l.startsWith('\\ No newline at end of file')) return false;
      return true;
    })
    .join('\n');

  return compressGeneric(filtered, maxLines, mode);
}
