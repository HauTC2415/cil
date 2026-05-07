import chalk from 'chalk';
import { searchMemory, getRecentMemories } from '../lib/db.js';

export async function retrieveCommand(query: string, options: { limit: number; category?: string }): Promise<void> {
  if (!query.trim()) {
    // Show recent memories
    const recent = getRecentMemories(20, 168); // last 7 days
    if (recent.length === 0) {
      console.log(chalk.dim('No memories found. Use /learn or /wrap-up to store context.'));
      return;
    }
    console.log(chalk.bold('\nRecent memories:\n'));
    printEntries(recent);
    return;
  }

  let results: ReturnType<typeof searchMemory>;
  try {
    results = searchMemory(query, options.limit, options.category);
  } catch {
    // FTS5 query syntax error — try with escaped query
    try {
      results = searchMemory(`"${query}"`, options.limit, options.category);
    } catch {
      results = [];
    }
  }

  if (results.length === 0) {
    console.log(chalk.dim(`No memories found for: "${query}"`));
    return;
  }

  console.log(chalk.bold(`\nMemories matching "${query}":\n`));
  printEntries(results);
}

function printEntries(entries: Array<{ category: string; content: string; tags: string; created_at: number }>): void {
  for (const entry of entries) {
    const date = new Date(entry.created_at).toLocaleDateString();
    const category = chalk.cyan(`[${entry.category}]`);
    const tags = entry.tags ? chalk.dim(` (${entry.tags})`) : '';
    console.log(`${category} ${entry.content}${tags} ${chalk.dim(date)}\n`);
  }
}
