#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { getPackageRoot } from './lib/paths.js';
import { initCommand } from './commands/init.js';
import { doctorCommand } from './commands/doctor.js';
import { compactCommand } from './commands/compact.js';
import { retrieveCommand } from './commands/retrieve.js';
import { resetCommand } from './commands/reset.js';
import { hookCommand } from './commands/hook.js';
import { compressCommand } from './commands/compress.js';
import { exportCommand } from './commands/export.js';
import { importCommand } from './commands/import.js';
import { pruneCommand } from './commands/prune.js';
import { uninstallCommand } from './commands/uninstall.js';
import { upgradeCommand } from './commands/upgrade.js';

const pkg = JSON.parse(
  fs.readFileSync(path.join(getPackageRoot(), 'package.json'), 'utf-8'),
) as { version: string };

const program = new Command();

program
  .name('cil')
  .description('Claude Intelligence Layer — token-efficient context runtime for Claude Code')
  .version(pkg.version);

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
  .description('Compress stdin output (modes: lite=filter only, full=4 pillars, ultra=+semantic dedup)')
  .option('-n, --lines <n>', 'Max output lines', '150')
  .option('-m, --mode <mode>', 'Compression intensity: lite | full | ultra', 'full')
  .action((options) =>
    compressCommand({ lines: parseInt(options.lines, 10), mode: options.mode }),
  );

program
  .command('export')
  .description('Export memory + sessions as JSON (stdout, or --out file)')
  .option('-o, --out <file>', 'Write to file instead of stdout')
  .action((options) => exportCommand({ out: options.out }));

program
  .command('import <file>')
  .description('Import a JSON export — duplicates skipped by content hash')
  .action((file: string) => importCommand(file));

program
  .command('prune')
  .description('Delete memory entries older than a duration')
  .option('--older-than <duration>', 'Threshold (e.g. 30d, 6mo, 1y)', '90d')
  .option('--dry-run', 'Show count without deleting', false)
  .option('-c, --category <cat>', 'Limit to a single category')
  .action((options) =>
    pruneCommand({
      olderThan: options.olderThan,
      dryRun: options.dryRun,
      category: options.category,
    }),
  );

program
  .command('uninstall')
  .description('Remove CIL templates, hooks, and MCP registration from the current project')
  .option('-g, --global', 'Uninstall global (~/.claude/commands/) install', false)
  .option('--purge', 'Also delete ~/.cil/ memory database', false)
  .action((options) =>
    uninstallCommand({ global: options.global, purge: options.purge }),
  );

program
  .command('upgrade')
  .description('Refresh slash commands, skills, and agents from the current CIL templates')
  .option('-g, --global', 'Upgrade the global install', false)
  .option('--check', 'Show which files would change without applying', false)
  .action((options) =>
    upgradeCommand({ global: options.global, check: options.check }),
  );

// Internal command used by Claude Code hooks — not shown in help
program
  .command('hook <event>', { hidden: true })
  .description('Handle a Claude Code hook event (internal)')
  .action((event: string) => hookCommand(event).catch(() => process.exit(0)));

program.parse();
