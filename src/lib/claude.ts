import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getClaudeHome, getClaudeSettingsPath, getClaudeCommandsDir } from './paths.js';

export function detectClaude(): boolean {
  try {
    execSync('claude --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getClaudeVersion(): string | null {
  try {
    const out = execSync('claude --version', { stdio: 'pipe' }).toString().trim();
    return out;
  } catch {
    return null;
  }
}

interface HookEntry {
  matcher?: string;
  hooks: Array<{ type: string; command: string }>;
}

interface Settings {
  hooks?: Record<string, HookEntry[]>;
  [key: string]: unknown;
}

export function readSettings(settingsPath: string): Settings {
  if (!fs.existsSync(settingsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Settings;
  } catch {
    return {};
  }
}

export function writeSettings(settingsPath: string, settings: Settings): void {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

export function configureHooks(settingsPath: string): void {
  const settings = readSettings(settingsPath);
  if (!settings.hooks) settings.hooks = {};

  const hookEvents: Record<string, string> = {
    PreToolUse: 'cil hook pre-tool-use',
    PostToolUse: 'cil hook post-tool-use',
    PreCompact: 'cil hook pre-compact',
    Stop: 'cil hook session-stop',
  };

  for (const [event, command] of Object.entries(hookEvents)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];

    const alreadyConfigured = settings.hooks[event]!.some(
      (entry) => entry.hooks?.some((h) => h.command === command),
    );

    if (!alreadyConfigured) {
      settings.hooks[event]!.push({
        hooks: [{ type: 'command', command }],
      });
    }
  }

  writeSettings(settingsPath, settings);
}

export function configureMCP(mcpServerPath: string): boolean {
  try {
    execSync(`claude mcp add cil node "${mcpServerPath}"`, { stdio: 'pipe' });
    return true;
  } catch {
    // Fallback: write directly to claude config
    return configureMCPManual(mcpServerPath);
  }
}

function configureMCPManual(mcpServerPath: string): boolean {
  const claudeHome = getClaudeHome();
  const configPath = path.join(claudeHome, 'claude_desktop_config.json');

  let config: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      config = {};
    }
  }

  if (!config['mcpServers']) config['mcpServers'] = {};
  (config['mcpServers'] as Record<string, unknown>)['cil'] = {
    command: 'node',
    args: [mcpServerPath],
    env: {},
  };

  try {
    fs.mkdirSync(claudeHome, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function ensureCommandsDir(scope: 'global' | 'local', projectDir?: string): string {
  const dir = getClaudeCommandsDir(scope, projectDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
