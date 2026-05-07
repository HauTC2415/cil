import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { CIL_HOME, DB_PATH, getClaudeHome, getClaudeSettingsPath, getTemplatesDir } from '../lib/paths.js';
import { detectClaude, getClaudeVersion } from '../lib/claude.js';

interface Check {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  detail?: string;
}

export async function doctorCommand(): Promise<void> {
  console.log(chalk.bold('\n CIL Doctor\n'));

  const checks: Check[] = [];

  // Node version
  const [major] = process.versions.node.split('.').map(Number);
  checks.push({
    name: 'Node.js >= 20',
    status: major >= 20 ? 'ok' : 'fail',
    detail: `v${process.versions.node}`,
  });

  // Claude Code
  const claudeOk = detectClaude();
  checks.push({
    name: 'Claude Code',
    status: claudeOk ? 'ok' : 'warn',
    detail: claudeOk ? getClaudeVersion() ?? 'detected' : 'not found in PATH',
  });

  // CIL home dir
  checks.push({
    name: 'CIL home (~/.cil/)',
    status: fs.existsSync(CIL_HOME) ? 'ok' : 'fail',
    detail: CIL_HOME,
  });

  // SQLite DB
  checks.push({
    name: 'Memory DB',
    status: fs.existsSync(DB_PATH) ? 'ok' : 'warn',
    detail: fs.existsSync(DB_PATH) ? DB_PATH : 'not initialized — run: cil init',
  });

  // Templates
  const templatesDir = getTemplatesDir();
  checks.push({
    name: 'Templates',
    status: fs.existsSync(templatesDir) ? 'ok' : 'fail',
    detail: templatesDir,
  });

  // Claude settings (hooks)
  const settingsPath = getClaudeSettingsPath('local');
  let hooksOk = false;
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>;
      hooksOk = !!(settings['hooks'] as Record<string, unknown> | undefined)?.['PostToolUse'];
    } catch {
      hooksOk = false;
    }
  }
  checks.push({
    name: 'Hooks configured',
    status: hooksOk ? 'ok' : 'warn',
    detail: hooksOk ? settingsPath : 'run: cil init to configure hooks',
  });

  // Print results
  for (const check of checks) {
    const icon = check.status === 'ok' ? chalk.green('✓') : check.status === 'warn' ? chalk.yellow('!') : chalk.red('✗');
    const name = check.status === 'fail' ? chalk.red(check.name) : check.name;
    const detail = check.detail ? chalk.dim(` — ${check.detail}`) : '';
    console.log(`  ${icon} ${name}${detail}`);
  }

  const failed = checks.filter((c) => c.status === 'fail').length;
  const warned = checks.filter((c) => c.status === 'warn').length;

  console.log('');
  if (failed > 0) {
    console.log(chalk.red(`${failed} check(s) failed. Run: cil init`));
  } else if (warned > 0) {
    console.log(chalk.yellow(`${warned} warning(s). CIL is functional.`));
  } else {
    console.log(chalk.green('All checks passed.'));
  }
  console.log('');
}
