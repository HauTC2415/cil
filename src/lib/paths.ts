import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export const CIL_HOME = path.join(os.homedir(), '.cil');
export const DB_PATH = path.join(CIL_HOME, 'memory.db');
export const HOOK_LOG_PATH = path.join(CIL_HOME, 'hook.log');
export const HOOK_LOG_MAX_BYTES = 1024 * 1024; // 1 MB rotation threshold

// Transcript byte size that triggers a context-pressure warning.
// 420 KB ≈ 120K tokens (3.5 chars/token) — the convergence point between
// "12% of a 1M-token window" and "60% of a 200K-token window". Hooks do not
// receive the active model, so a single absolute threshold is used regardless
// of window size. Override via CIL_CONTEXT_WARN_BYTES.
export const CONTEXT_WARN_BYTES = (() => {
  const fromEnv = Number(process.env['CIL_CONTEXT_WARN_BYTES']);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 420_000;
})();

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
