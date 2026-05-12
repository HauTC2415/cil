import fs from 'fs';
import path from 'path';
import { getTemplatesDir, getClaudeCommandsDir } from './paths.js';

export function installCLAUDEMD(targetDir: string): void {
  const src = path.join(getTemplatesDir(), 'claude', 'CLAUDE.md');
  const dest = path.join(targetDir, 'CLAUDE.md');

  if (fs.existsSync(dest)) {
    const backup = dest + '.bak';
    fs.copyFileSync(dest, backup);
    console.log(`  Backed up existing CLAUDE.md → CLAUDE.md.bak`);
  }

  fs.copyFileSync(src, dest);
}

export function installWorkflows(commandsDir: string): void {
  const srcDir = path.join(getTemplatesDir(), 'workflows');
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.md'));

  fs.mkdirSync(commandsDir, { recursive: true });

  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(commandsDir, file);
    fs.copyFileSync(src, dest);
  }
}

// Skills follow Claude Code's native layout: .claude/skills/<name>/SKILL.md
// so Claude Code can auto-discover them from frontmatter.
export function installSkills(targetDir: string): void {
  const srcDir = path.join(getTemplatesDir(), 'skills');
  const destDir = path.join(targetDir, '.claude', 'skills');
  copyDir(srcDir, destDir);
}

// Agents follow Claude Code's native layout: .claude/agents/<name>.md (flat).
// Frontmatter (name + description) lets the Agent tool auto-route by intent.
export function installAgents(targetDir: string): void {
  const srcDir = path.join(getTemplatesDir(), 'agents');
  const destDir = path.join(targetDir, '.claude', 'agents');
  copyDir(srcDir, destDir);
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export interface InstalledFiles {
  workflows: string[]; // absolute paths to .md files cil init would create
  skills: string[];    // absolute paths to skill directories
  agents: string[];    // absolute paths to agent .md files
}

// Return the exact paths cil init creates, computed from the templates/
// directory shipped with this CIL version. Used by uninstall and update so
// they only touch files CIL owns — never user-authored ones.
export function listInstalledFiles(
  scope: 'global' | 'local',
  projectDir: string,
): InstalledFiles {
  const commandsDir = getClaudeCommandsDir(scope, projectDir);
  const skillsDir = path.join(projectDir, '.claude', 'skills');
  const agentsDir = path.join(projectDir, '.claude', 'agents');
  const templatesDir = getTemplatesDir();

  const workflowFiles = fs.readdirSync(path.join(templatesDir, 'workflows'))
    .filter((f) => f.endsWith('.md'));
  const skillNames = fs.readdirSync(path.join(templatesDir, 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const agentFiles = fs.readdirSync(path.join(templatesDir, 'agents'))
    .filter((f) => f.endsWith('.md'));

  return {
    workflows: workflowFiles.map((f) => path.join(commandsDir, f)),
    skills: skillNames.map((n) => path.join(skillsDir, n)),
    agents: agentFiles.map((f) => path.join(agentsDir, f)),
  };
}
