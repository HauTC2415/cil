import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { getTemplatesDir, getPackageRoot } from '../lib/paths.js';
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

function getCurrentVersion(): string {
  const pkgPath = path.join(getPackageRoot(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version: string };
  return pkg.version;
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch('https://registry.npmjs.org/@hautc.it/cil/latest', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string): number[] => v.split('.').map(Number);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true;
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false;
  }
  return false;
}

export async function upgradeCommand(options: UpgradeOptions): Promise<void> {
  console.log(chalk.bold('\n CIL — Upgrade\n'));

  const current = getCurrentVersion();

  // 1. Check npm for newer version
  process.stdout.write(chalk.dim('  Checking npm registry... '));
  const latest = await fetchLatestVersion();

  if (!latest) {
    console.log(chalk.yellow('offline'));
    console.log(chalk.dim('  Could not reach npm registry — skipping package update.\n'));
  } else if (!isNewer(latest, current)) {
    console.log(chalk.green('up to date'));
    console.log(chalk.dim(`  Package ${current} is already the latest.\n`));
  } else {
    console.log(chalk.cyan('update available'));
    console.log(`  ${chalk.dim(current)} → ${chalk.green.bold(latest)}\n`);

    if (options.check) {
      console.log(chalk.dim(`  Run \`cil upgrade\` (without --check) to install.\n`));
    } else {
      console.log(chalk.dim('  Running: npm install -g @hautc.it/cil@latest\n'));
      try {
        execSync('npm install -g @hautc.it/cil@latest', { stdio: 'inherit' });
        console.log(chalk.green('\n  ✓ Package updated to ' + latest + '.\n'));
      } catch {
        console.error(chalk.red('\n  ✗ npm install failed. Try manually:'));
        console.error('    npm install -g @hautc.it/cil@latest\n');
        return;
      }
    }
  }

  // 2. Sync templates (picks up new content from the freshly installed package)
  const projectDir = process.cwd();
  const scope = options.global ? 'global' : 'local';
  const diffs = computeDiffs(scope, projectDir);

  if (diffs.length === 0) {
    console.log(chalk.green('  ✓ Templates up to date.\n'));
    return;
  }

  console.log(chalk.bold(`  ${diffs.length} template(s) differ:\n`));
  for (const d of diffs) {
    const rel = path.relative(projectDir, d.installed);
    const marker = d.status === 'new' ? chalk.cyan('+') : chalk.yellow('~');
    console.log(`    ${marker} ${rel}`);
  }
  console.log('');

  if (options.check) {
    console.log(chalk.dim('  --check: no changes applied. Run `cil upgrade` to apply.\n'));
    return;
  }

  const commandsDir = ensureCommandsDir(scope, projectDir);
  installWorkflows(commandsDir);
  installSkills(projectDir);
  installAgents(projectDir);

  console.log(chalk.green(`✓ ${diffs.length} template(s) upgraded.\n`));
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
  for (const skillDir of fs
    .readdirSync(skillsSrc, { withFileTypes: true })
    .filter((e) => e.isDirectory())) {
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
  if (a !== b) result.push({ template: src, installed: dest, status: 'changed' });
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
