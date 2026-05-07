import { compress } from '../lib/compress.js';

export async function compressCommand(options: { lines: number }): Promise<void> {
  const raw = await readStdin();
  if (!raw.trim()) return;
  process.stdout.write(compress(raw, options.lines));
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
