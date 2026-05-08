import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import {
  CIL_HOME,
  DB_PATH,
  getClaudeSettingsPath,
  getClaudeCommandsDir,
  getPackageRoot,
} from '../lib/paths.js';
import { getDb } from '../lib/db.js';
import { detectClaude, configureHooks, configureMCP, ensureCommandsDir } from '../lib/claude.js';
import { installCLAUDEMD, installWorkflows, installSkills, installAgents } from '../lib/templates.js';

interface InitOptions {
  global: boolean;
  skipMcp: boolean;
  skipHooks: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.bold('\n CIL — Claude Intelligence Layer\n'));

  const projectDir = process.cwd();
  const scope = options.global ? 'global' : 'local';
  const targetDir = options.global ? path.join(process.env['HOME'] ?? process.env['USERPROFILE'] ?? '~') : projectDir;

  // 1. Check Node version
  const spinner = ora('Checking prerequisites').start();
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 20) {
    spinner.fail(`Node.js >= 20 required (found ${process.versions.node})`);
    process.exit(1);
  }
  spinner.succeed('Node.js ' + process.versions.node);

  // 2. Check Claude Code
  const claudeSpinner = ora('Detecting Claude Code').start();
  if (!detectClaude()) {
    claudeSpinner.warn('Claude Code not found in PATH — install from https://claude.ai/code');
  } else {
    claudeSpinner.succeed('Claude Code detected');
  }

  // 3. Create ~/.cil/ and init DB
  const dbSpinner = ora('Initializing memory database').start();
  try {
    fs.mkdirSync(CIL_HOME, { recursive: true });
    getDb(DB_PATH); // creates tables
    dbSpinner.succeed(`Memory DB: ${DB_PATH}`);
  } catch (err) {
    dbSpinner.fail(`DB init failed: ${String(err)}`);
    process.exit(1);
  }

  // 4. Install CLAUDE.md
  const claudeMdSpinner = ora('Installing CLAUDE.md').start();
  try {
    installCLAUDEMD(projectDir);
    claudeMdSpinner.succeed(`CLAUDE.md → ${projectDir}`);
  } catch (err) {
    claudeMdSpinner.fail(`CLAUDE.md install failed: ${String(err)}`);
  }

  // 5. Install workflows (slash commands)
  const workflowsSpinner = ora('Installing workflows').start();
  try {
    const commandsDir = ensureCommandsDir(scope, projectDir);
    installWorkflows(commandsDir);
    workflowsSpinner.succeed(`Workflows → ${commandsDir}`);
  } catch (err) {
    workflowsSpinner.fail(`Workflows install failed: ${String(err)}`);
  }

  // 6. Install skills and agents
  const skillsSpinner = ora('Installing skills & agents').start();
  try {
    installSkills(projectDir);
    installAgents(projectDir);
    skillsSpinner.succeed(`Skills → .claude/skills/  ·  Agents → .claude/agents/`);

    // Warn about stale templates from earlier CIL versions (pre-native layout)
    const legacy = [
      path.join(projectDir, '.cil', 'skills'),
      path.join(projectDir, '.cil', 'agents'),
    ].filter((p) => fs.existsSync(p));
    if (legacy.length > 0) {
      console.log(
        chalk.yellow(
          `  ⚠ Found legacy CIL templates: ${legacy.map((p) => path.relative(projectDir, p)).join(', ')}\n` +
          `    Claude Code now reads .claude/skills/<name>/SKILL.md and .claude/agents/<name>.md.\n` +
          `    Safe to remove: rm -rf .cil/skills .cil/agents`,
        ),
      );
    }
  } catch (err) {
    skillsSpinner.fail(`Skills install failed: ${String(err)}`);
  }

  // 7. Configure hooks
  if (!options.skipHooks) {
    const hooksSpinner = ora('Configuring Claude Code hooks').start();
    try {
      const settingsPath = getClaudeSettingsPath(scope, projectDir);
      configureHooks(settingsPath);
      hooksSpinner.succeed(`Hooks configured in ${settingsPath}`);
    } catch (err) {
      hooksSpinner.fail(`Hooks config failed: ${String(err)}`);
    }
  }

  // 8. Register MCP server
  if (!options.skipMcp) {
    const mcpSpinner = ora('Registering MCP server').start();
    try {
      const mcpPath = path.join(getPackageRoot(), 'dist', 'mcp', 'index.js');
      const ok = configureMCP(mcpPath);
      if (ok) {
        mcpSpinner.succeed('CIL MCP server registered');
      } else {
        mcpSpinner.warn(`MCP registration failed — run manually:\n  claude mcp add cil node "${mcpPath}"`);
      }
    } catch (err) {
      mcpSpinner.warn(`MCP registration failed: ${String(err)}`);
    }
  }

  console.log(chalk.green('\n✓ CIL initialized\n'));
  console.log('Start Claude Code and try:');
  console.log(chalk.cyan('  /develop implement your feature'));
  console.log(chalk.cyan('  /wrap-up'));
  console.log(chalk.cyan('  /retrieve your query\n'));
}
