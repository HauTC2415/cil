import { compress, type CompressionMode } from '../lib/compress.js';

interface CompressOptions {
  lines: number;
  mode: CompressionMode;
}

const VALID_MODES: CompressionMode[] = ['lite', 'full', 'ultra'];

export async function compressCommand(options: CompressOptions): Promise<void> {
  const raw = await readStdin();
  if (!raw.trim()) return;

  const mode: CompressionMode = VALID_MODES.includes(options.mode) ? options.mode : 'full';
  process.stdout.write(compress(raw, options.lines, mode));
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}
