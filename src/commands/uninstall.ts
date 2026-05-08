import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CIL_HOME, DB_PATH, getClaudeSettingsPath } from '../lib/paths.js';
import { unconfigureHooks, unconfigureMCP } from '../lib/claude.js';
import { listInstalledFiles } from '../lib/templates.js';

interface UninstallOptions {
  global: boolean;
  purge: boolean;
}

export async function uninstallCommand(options: UninstallOptions): Promise<void> {
  console.log(chalk.bold('\n CIL — Uninstall\n'));

  const projectDir = process.cwd();
  const scope = options.global ? 'global' : 'local';
  const installed = listInstalledFiles(scope, projectDir);
  const settingsPath = getClaudeSettingsPath(scope, projectDir);

  const allTargets = [...installed.workflows, ...installed.skills, ...installed.agents];
  const found = allTargets.filter((p) => fs.existsSync(p));
  if (found.length === 0 && !fs.existsSync(settingsPath) && !fs.existsSync(DB_PATH)) {
    console.log(chalk.yellow('  CIL not installed in this project.\n'));
    return;
  }

  // 1. Workflow .md files
  let workflowsRemoved = 0;
  for (const filePath of installed.workflows) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      workflowsRemoved++;
    }
  }
  console.log(chalk.green(`  ✓ Workflows removed: ${workflowsRemoved}`));

  // 2. Skill directories
  let skillsRemoved = 0;
  for (const skillDir of installed.skills) {
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
      skillsRemoved++;
    }
  }
  console.log(chalk.green(`  ✓ Skills removed: ${skillsRemoved}`));

  // 3. Agent .md files
  let agentsRemoved = 0;
  for (const filePath of installed.agents) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      agentsRemoved++;
    }
  }
  console.log(chalk.green(`  ✓ Agents removed: ${agentsRemoved}`));

  // Clean up empty .claude/skills and .claude/agents dirs (don't touch .claude itself)
  const skillsParent = path.join(projectDir, '.claude', 'skills');
  if (fs.existsSync(skillsParent) && fs.readdirSync(skillsParent).length === 0) {
    fs.rmdirSync(skillsParent);
  }
  const agentsParent = path.join(projectDir, '.claude', 'agents');
  if (fs.existsSync(agentsParent) && fs.readdirSync(agentsParent).length === 0) {
    fs.rmdirSync(agentsParent);
  }

  // 4. Hooks in settings.json
  if (fs.existsSync(settingsPath)) {
    const removed = unconfigureHooks(settingsPath);
    const rel = path.relative(projectDir, settingsPath) || settingsPath;
    console.log(chalk.green(`  ✓ Hooks removed: ${removed} (in ${rel})`));
  }

  // 5. MCP server registration
  const mcpSpinner = ora('Unregistering MCP server').start();
  const mcpOk = unconfigureMCP();
  if (mcpOk) {
    mcpSpinner.succeed('MCP server unregistered');
  } else {
    mcpSpinner.warn('MCP unregister failed — run manually:  claude mcp remove cil');
  }

  // 6. Memory DB (default keep)
  if (options.purge) {
    if (fs.existsSync(CIL_HOME)) {
      fs.rmSync(CIL_HOME, { recursive: true, force: true });
      console.log(chalk.green(`  ✓ Memory DB purged (${DB_PATH})`));
    }
  } else if (fs.existsSync(DB_PATH)) {
    console.log(chalk.dim(`  · Memory DB kept (${DB_PATH}) — pass --purge to delete`));
  }

  // 7. CLAUDE.md (warn only — often customized)
  const claudeMdPath = path.join(projectDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    console.log(chalk.yellow('\n  ⚠ CLAUDE.md not removed automatically (often customized).'));
    console.log(chalk.yellow('    Manual: rm CLAUDE.md  (or edit to remove CIL principles)'));
  }

  console.log(chalk.green('\n✓ CIL uninstalled\n'));
}
