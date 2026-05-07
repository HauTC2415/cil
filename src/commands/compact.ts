import chalk from 'chalk';
import { getRecentMemories, getLatestSession } from '../lib/db.js';

export async function compactCommand(): Promise<void> {
  const memories = getRecentMemories(30, 72);
  const session = getLatestSession();

  const lines: string[] = ['# CIL Context Snapshot', ''];

  if (session) {
    lines.push('## Last Session', session.snapshot, '');
  }

  const categories = ['decision', 'constraint', 'architecture', 'learning', 'task'];

  for (const cat of categories) {
    const entries = memories.filter((m) => m.category === cat);
    if (entries.length === 0) continue;
    lines.push(`## ${capitalize(cat)}s`);
    for (const e of entries) {
      lines.push(`- ${e.content}`);
    }
    lines.push('');
  }

  const output = lines.join('\n');
  const bytes = Buffer.byteLength(output, 'utf-8');

  console.log(output);
  console.log(chalk.dim(`\n[${bytes} bytes | ${memories.length} memories]`));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
