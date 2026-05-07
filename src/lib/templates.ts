import fs from 'fs';
import path from 'path';
import { getTemplatesDir } from './paths.js';

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

export function installSkills(targetDir: string): void {
  const srcDir = path.join(getTemplatesDir(), 'skills');
  const destDir = path.join(targetDir, '.cil', 'skills');
  copyDir(srcDir, destDir);
}

export function installAgents(targetDir: string): void {
  const srcDir = path.join(getTemplatesDir(), 'agents');
  const destDir = path.join(targetDir, '.cil', 'agents');
  copyDir(srcDir, destDir);
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    fs.copyFileSync(srcPath, destPath);
  }
}

export function listWorkflows(): string[] {
  const srcDir = path.join(getTemplatesDir(), 'workflows');
  return fs.readdirSync(srcDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => '/' + f.replace('.md', ''));
}

export function listSkills(): string[] {
  const srcDir = path.join(getTemplatesDir(), 'skills');
  return fs.readdirSync(srcDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''));
}
