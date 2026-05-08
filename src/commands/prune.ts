import chalk from 'chalk';
import { getDb } from '../lib/db.js';

interface PruneOptions {
  olderThan: string;  // e.g. "90d", "6mo", "1y"
  dryRun: boolean;
  category?: string;
}

// Parse "90d", "6mo", "1y" into milliseconds.
function parseDuration(spec: string): number | null {
  const m = spec.match(/^(\d+)\s*(d|w|mo|m|y)$/i);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  const unit = m[2]!.toLowerCase();
  const day = 86_400_000;
  switch (unit) {
    case 'd': return n * day;
    case 'w': return n * 7 * day;
    case 'm':
    case 'mo': return n * 30 * day;
    case 'y': return n * 365 * day;
    default: return null;
  }
}

export async function pruneCommand(options: PruneOptions): Promise<void> {
  const ms = parseDuration(options.olderThan);
  if (ms == null) {
    console.error(chalk.red(`Invalid --older-than value: ${options.olderThan}`));
    console.error(chalk.dim('Examples: 30d, 12w, 6mo, 1y'));
    process.exit(1);
  }

  const cutoff = Date.now() - ms;
  const db = getDb();

  const params: (string | number)[] = [cutoff];
  let where = 'created_at < ?';
  if (options.category) {
    where += ' AND category = ?';
    params.push(options.category);
  }

  const count = (db.prepare(`SELECT COUNT(*) as c FROM memory WHERE ${where}`).get(...params) as { c: number }).c;

  if (count === 0) {
    console.log(chalk.dim(`No memories older than ${options.olderThan}.`));
    return;
  }

  if (options.dryRun) {
    console.log(chalk.yellow(`[dry-run] Would delete ${count} memory entries older than ${options.olderThan}.`));
    return;
  }

  const deleted = db.prepare(`DELETE FROM memory WHERE ${where}`).run(...params).changes;
  console.log(chalk.green(`✓ Deleted ${deleted} memory entries older than ${options.olderThan}.`));
}
