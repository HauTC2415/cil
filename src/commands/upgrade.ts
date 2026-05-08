import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { getTemplatesDir } from '../lib/paths.js';
import { ensureCommandsDir } from '../lib/claude.js';
import {
  installWorkflows,
  installSkills,
  installAgents,
  listInstalledFiles,
} from '../lib/templates.js';

interface UpgradeOptions {
  global: boolean;
  check: boolean;
}

interface FileDiff {
  template: string;
  installed: string;
  status: 'new' | 'changed';
}

export async function upgradeCommand(options: UpgradeOptions): Promise<void> {
  console.log(chalk.bold('\n CIL — Upgrade templates\n'));

  const projectDir = process.cwd();
  const scope = options.global ? 'global' : 'local';
  const diffs = computeDiffs(scope, projectDir);

  if (diffs.length === 0) {
    console.log(chalk.green('  ✓ All templates up to date.\n'));
    return;
  }

  console.log(chalk.bold(`  ${diffs.length} file(s) differ from current templates:\n`));
  for (const d of diffs) {
    const rel = path.relative(projectDir, d.installed);
    const marker = d.status === 'new' ? chalk.cyan('+') : chalk.yellow('~');
    console.log(`    ${marker} ${rel}`);
  }
  console.log('');

  if (options.check) {
    console.log(chalk.dim('  --check: no changes applied. Run `cil upgrade` (no flag) to apply.\n'));
    return;
  }

  const commandsDir = ensureCommandsDir(scope, projectDir);
  installWorkflows(commandsDir);
  installSkills(projectDir);
  installAgents(projectDir);

  console.log(chalk.green(`✓ ${diffs.length} file(s) upgraded.`));
  console.log(chalk.dim('  Memory DB and CLAUDE.md were not touched.\n'));
}

function computeDiffs(scope: 'global' | 'local', projectDir: string): FileDiff[] {
  const result: FileDiff[] = [];
  const templatesDir = getTemplatesDir();
  const installed = listInstalledFiles(scope, projectDir);

  const workflowsSrc = path.join(templatesDir, 'workflows');
  for (const file of fs.readdirSync(workflowsSrc).filter((f) => f.endsWith('.md'))) {
    const src = path.join(workflowsSrc, file);
    const dest = installed.workflows.find((p) => path.basename(p) === file);
    if (dest) addIfDiffers(result, src, dest);
  }

  const skillsSrc = path.join(templatesDir, 'skills');
  for (const skillDir of fs.readdirSync(skillsSrc, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const srcDir = path.join(skillsSrc, skillDir.name);
    const destDir = installed.skills.find((p) => path.basename(p) === skillDir.name);
    if (destDir) walkAndDiff(result, srcDir, destDir);
  }

  const agentsSrc = path.join(templatesDir, 'agents');
  for (const file of fs.readdirSync(agentsSrc).filter((f) => f.endsWith('.md'))) {
    const src = path.join(agentsSrc, file);
    const dest = installed.agents.find((p) => path.basename(p) === file);
    if (dest) addIfDiffers(result, src, dest);
  }

  return result;
}

function addIfDiffers(result: FileDiff[], src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    result.push({ template: src, installed: dest, status: 'new' });
    return;
  }
  const a = fs.readFileSync(src, 'utf-8');
  const b = fs.readFileSync(dest, 'utf-8');
  if (a !== b) {
    result.push({ template: src, installed: dest, status: 'changed' });
  }
}

function walkAndDiff(result: FileDiff[], srcDir: string, destDir: string): void {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      walkAndDiff(result, src, dest);
    } else {
      addIfDiffers(result, src, dest);
    }
  }
}
