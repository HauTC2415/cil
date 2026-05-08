import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { CIL_HOME, DB_PATH, HOOK_LOG_PATH, getClaudeSettingsPath, getTemplatesDir } from '../lib/paths.js';
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

  // Skills frontmatter validation (deployed skills, if present)
  const projectSkillsDir = path.join(process.cwd(), '.claude', 'skills');
  if (fs.existsSync(projectSkillsDir)) {
    const issues = validateDeployedSkills(projectSkillsDir);
    checks.push({
      name: 'Skills frontmatter',
      status: issues.length === 0 ? 'ok' : 'warn',
      detail: issues.length === 0 ? `${countSkillFiles(projectSkillsDir)} skill(s) valid` : issues.join('; '),
    });
  }

  // Recent hook errors
  const hookErrors = readRecentHookErrors(5);
  if (hookErrors.length > 0) {
    checks.push({
      name: 'Recent hook errors',
      status: 'warn',
      detail: `${hookErrors.length} entry/entries in ${HOOK_LOG_PATH}`,
    });
  }

  // Print results
  for (const check of checks) {
    const icon = check.status === 'ok' ? chalk.green('✓') : check.status === 'warn' ? chalk.yellow('!') : chalk.red('✗');
    const name = check.status === 'fail' ? chalk.red(check.name) : check.name;
    const detail = check.detail ? chalk.dim(` — ${check.detail}`) : '';
    console.log(`  ${icon} ${name}${detail}`);
  }

  if (hookErrors.length > 0) {
    console.log(chalk.yellow('\n  Last hook errors:'));
    for (const line of hookErrors) {
      console.log(chalk.dim('    ' + line));
    }
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

// Walks .claude/skills/<name>/SKILL.md and reports frontmatter problems.
// Returns a short list of human-readable issues.
function validateDeployedSkills(skillsDir: string): string[] {
  const issues: string[] = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      issues.push(`${entry.name}: missing SKILL.md`);
      continue;
    }
    const content = fs.readFileSync(skillFile, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm) {
      issues.push(`${entry.name}: no YAML frontmatter`);
      continue;
    }
    if (!fm.name) issues.push(`${entry.name}: missing 'name'`);
    if (!fm.description) issues.push(`${entry.name}: missing 'description'`);
  }
  return issues;
}

function countSkillFiles(skillsDir: string): number {
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md')))
    .length;
}

// Minimal YAML frontmatter parser — pulls top-level `key: value` pairs.
// Returns null if the file does not start with `---`.
function parseFrontmatter(content: string): Record<string, string> | null {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end < 0) return null;
  const block = content.slice(3, end);
  const out: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z][\w-]*)\s*:\s*(.*)$/);
    if (m) out[m[1]!] = m[2]!.trim();
  }
  return out;
}

// Tail the hook log; returns up to `n` most recent lines.
function readRecentHookErrors(n: number): string[] {
  if (!fs.existsSync(HOOK_LOG_PATH)) return [];
  try {
    const text = fs.readFileSync(HOOK_LOG_PATH, 'utf-8');
    return text.split('\n').filter(Boolean).slice(-n);
  } catch {
    return [];
  }
}
