#!/usr/bin/env node
// Detect drift between source-of-truth slash commands (templates/workflows/)
// and the deployed copy under .claude/commands/. Exits non-zero on drift.
//
// Usage:
//   node scripts/sync-templates.mjs           # report drift
//   node scripts/sync-templates.mjs --apply   # copy templates → .claude/commands

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const srcDir = join(repoRoot, 'templates', 'workflows');
const destDir = join(repoRoot, '.claude', 'commands');

const apply = process.argv.includes('--apply');

// Project-local slash commands that intentionally live only under
// .claude/commands/ — they're for working on this repo itself and must
// not ship to other users via `cil init`.
const LOCAL_ONLY = new Set(['release.md']);

function listMd(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md'));
}

const srcFiles = new Set(listMd(srcDir));
const destFiles = new Set(listMd(destDir));

const missingInDest = [...srcFiles].filter((f) => !destFiles.has(f));
const extraInDest = [...destFiles].filter((f) => !srcFiles.has(f) && !LOCAL_ONLY.has(f));

const drifted = [];
for (const f of srcFiles) {
  if (!destFiles.has(f)) continue;
  const a = readFileSync(join(srcDir, f), 'utf-8');
  const b = readFileSync(join(destDir, f), 'utf-8');
  if (a !== b) drifted.push(f);
}

const hasDrift = missingInDest.length > 0 || extraInDest.length > 0 || drifted.length > 0;

if (!hasDrift) {
  console.log('✓ templates/workflows ↔ .claude/commands in sync');
  process.exit(0);
}

console.log('Drift detected between templates/workflows and .claude/commands:\n');
if (missingInDest.length) console.log('  Missing in .claude/commands:', missingInDest.join(', '));
if (extraInDest.length)    console.log('  Extra in .claude/commands:  ', extraInDest.join(', '));
if (drifted.length)        console.log('  Content differs:           ', drifted.join(', '));

if (!apply) {
  console.log('\nRun with --apply to copy templates → .claude/commands.');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
for (const f of missingInDest) {
  writeFileSync(join(destDir, f), readFileSync(join(srcDir, f)));
  console.log('  added:    .claude/commands/' + f);
}
for (const f of drifted) {
  writeFileSync(join(destDir, f), readFileSync(join(srcDir, f)));
  console.log('  updated:  .claude/commands/' + f);
}
console.log('\n✓ synced');
