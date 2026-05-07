#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { doctorCommand } from './commands/doctor.js';
import { compactCommand } from './commands/compact.js';
import { retrieveCommand } from './commands/retrieve.js';
import { resetCommand } from './commands/reset.js';
import { hookCommand } from './commands/hook.js';
import { compressCommand } from './commands/compress.js';

const program = new Command();

program
  .name('cil')
  .description('Claude Intelligence Layer — token-efficient context runtime for Claude Code')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize CIL in the current project')
  .option('-g, --global', 'Install globally (commands in ~/.claude/commands/)', false)
  .option('--skip-mcp', 'Skip MCP server registration', false)
  .option('--skip-hooks', 'Skip hook configuration', false)
  .action((options) =>
    initCommand({ global: options.global, skipMcp: options.skipMcp, skipHooks: options.skipHooks }),
  );

program
  .command('doctor')
  .description('Validate CIL installation')
  .action(() => doctorCommand());

program
  .command('compact')
  .description('Print a compact context snapshot from memory')
  .action(() => compactCommand());

program
  .command('retrieve [query]')
  .description('Search memory')
  .option('-n, --limit <n>', 'Max results', '8')
  .option('-c, --category <cat>', 'Filter by category')
  .action((query: string = '', options) =>
    retrieveCommand(query, { limit: parseInt(options.limit, 10), category: options.category }),
  );

program
  .command('reset')
  .description('Reset CIL data')
  .option('--db', 'Reset memory database')
  .option('--all', 'Reset all CIL data')
  .action((options) => resetCommand({ db: options.db, all: options.all }));

program
  .command('compress')
  .description('Compress stdin output (RTK-style: filter, group, truncate, deduplicate)')
  .option('-n, --lines <n>', 'Max output lines', '150')
  .action((options) => compressCommand({ lines: parseInt(options.lines, 10) }));

// Internal command used by Claude Code hooks — not shown in help
program
  .command('hook <event>', { hidden: true })
  .description('Handle a Claude Code hook event (internal)')
  .action((event: string) => hookCommand(event).catch(() => process.exit(0)));

program.parse();
