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

  type HookDef = { matcher?: string; command: string };
  const hookDefs: Record<string, HookDef> = {
    PreToolUse:        { matcher: 'Bash', command: 'cil hook pre-tool-use' },
    PostToolUse:       { command: 'cil hook post-tool-use' },
    PreCompact:        { command: 'cil hook pre-compact' },
    Stop:              { command: 'cil hook session-stop' },
    UserPromptSubmit:  { command: 'cil hook user-prompt-submit' },
  };

  for (const [event, def] of Object.entries(hookDefs)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];

    const alreadyConfigured = settings.hooks[event]!.some(
      (entry) => entry.hooks?.some((h) => h.command === def.command),
    );

    if (!alreadyConfigured) {
      const entry: HookEntry = { hooks: [{ type: 'command', command: def.command }] };
      if (def.matcher) entry.matcher = def.matcher;
      settings.hooks[event]!.push(entry);
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

// Inverse of configureHooks. Removes only hook entries whose command starts
// with "cil hook" — leaves any other hooks the user has configured intact.
// Returns the count of hook entries removed.
export function unconfigureHooks(settingsPath: string): number {
  if (!fs.existsSync(settingsPath)) return 0;
  const settings = readSettings(settingsPath);
  if (!settings.hooks) return 0;

  let removed = 0;
  for (const event of Object.keys(settings.hooks)) {
    const entries = settings.hooks[event] ?? [];
    const cleaned: HookEntry[] = [];
    for (const entry of entries) {
      const filteredHooks = (entry.hooks ?? []).filter((h) => !h.command?.startsWith('cil hook'));
      const removedThisEntry = (entry.hooks?.length ?? 0) - filteredHooks.length;
      removed += removedThisEntry;
      if (filteredHooks.length > 0) {
        cleaned.push({ ...entry, hooks: filteredHooks });
      }
    }
    if (cleaned.length === 0) {
      delete settings.hooks[event];
    } else {
      settings.hooks[event] = cleaned;
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeSettings(settingsPath, settings);
  return removed;
}

// Inverse of configureMCP. Tries `claude mcp remove cil` first, falls back to
// directly editing claude_desktop_config.json. Returns true if the entry was
// either removed or didn't exist.
export function unconfigureMCP(): boolean {
  try {
    execSync('claude mcp remove cil', { stdio: 'pipe' });
    return true;
  } catch {
    return unconfigureMCPManual();
  }
}

function unconfigureMCPManual(): boolean {
  const claudeHome = getClaudeHome();
  const configPath = path.join(claudeHome, 'claude_desktop_config.json');
  if (!fs.existsSync(configPath)) return true; // nothing to remove

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return false;
  }

  const servers = config['mcpServers'] as Record<string, unknown> | undefined;
  if (!servers || !servers['cil']) return true;

  delete servers['cil'];
  if (Object.keys(servers).length === 0) {
    delete config['mcpServers'];
  }

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    return true;
  } catch {
    return false;
  }
}
