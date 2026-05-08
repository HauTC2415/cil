// docker build/pull — collapse layer-pull progress and step boilerplate.

import { compressGeneric, type CompressionMode } from './generic.js';

export function compressDocker(raw: string, maxLines = 150, mode: CompressionMode = 'full'): string {
  const lines = raw.split('\n');
  const out: string[] = [];
  let pulling = 0;
  let extracting = 0;

  const flush = (): void => {
    if (pulling > 0) {
      out.push(`(${pulling} layer(s) pulling/pulled)`);
      pulling = 0;
    }
    if (extracting > 0) {
      out.push(`(${extracting} layer(s) extracting/already exists)`);
      extracting = 0;
    }
  };

  for (const line of lines) {
    // Layer pull progress: "abc123def456: Pulling fs layer", "Pull complete", etc.
    if (/^[\da-f]{12}:\s+(Pulling fs layer|Waiting|Verifying Checksum|Download complete|Pull complete)\s*$/.test(line)) {
      pulling++;
      continue;
    }
    if (/^[\da-f]{12}:\s+(Already exists|Extracting)\b/.test(line)) {
      extracting++;
      continue;
    }
    // Build step boilerplate "Step 1/12 : FROM ..." → keep step header, drop image-id-only lines
    if (/^\s*--->\s+[\da-f]{12}\s*$/.test(line)) {
      // Intermediate image hash lines — pure noise to a reader
      continue;
    }
    if (/^\s*--->\s+Using cache\s*$/.test(line)) {
      // Cache-hit boilerplate
      continue;
    }
    flush();
    out.push(line);
  }
  flush();

  return compressGeneric(out.join('\n'), maxLines, mode);
}
