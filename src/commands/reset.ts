import fs from 'fs';
import readline from 'readline';
import chalk from 'chalk';
import { DB_PATH } from '../lib/paths.js';

export async function resetCommand(options: { db: boolean; all: boolean }): Promise<void> {
  if (!options.db && !options.all) {
    console.log(chalk.yellow('Specify what to reset:'));
    console.log('  cil reset --db    Reset memory database');
    console.log('  cil reset --all   Reset everything');
    return;
  }

  const confirmed = await confirm('This will permanently delete CIL data. Continue? (y/N) ');
  if (!confirmed) {
    console.log('Aborted.');
    return;
  }

  if (options.db || options.all) {
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
      console.log(chalk.green(`✓ Deleted ${DB_PATH}`));
    } else {
      console.log(chalk.dim('No database found.'));
    }
  }
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}
