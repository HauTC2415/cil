import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export const CIL_HOME = path.join(os.homedir(), '.cil');
export const DB_PATH = path.join(CIL_HOME, 'memory.db');
export const CONFIG_PATH = path.join(CIL_HOME, 'config.json');

export function getClaudeHome(): string {
  if (process.platform === 'win32') {
    const appData = process.env['APPDATA'] ?? path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'Claude');
  }
  return path.join(os.homedir(), '.claude');
}

export function getClaudeSettingsPath(scope: 'global' | 'local' = 'global', projectDir?: string): string {
  if (scope === 'local') {
    const dir = projectDir ?? process.cwd();
    return path.join(dir, '.claude', 'settings.json');
  }
  return path.join(getClaudeHome(), 'settings.json');
}

export function getClaudeCommandsDir(scope: 'global' | 'local' = 'local', projectDir?: string): string {
  if (scope === 'global') {
    return path.join(getClaudeHome(), 'commands');
  }
  const dir = projectDir ?? process.cwd();
  return path.join(dir, '.claude', 'commands');
}

export function getPackageRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  // dist/lib/paths.js → two levels up → package root
  return path.resolve(path.dirname(__filename), '..', '..');
}

export function getTemplatesDir(): string {
  return path.join(getPackageRoot(), 'templates');
}
