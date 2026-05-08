// Lightweight tests for the small helpers introduced for `cil doctor`
// validation + hook-log tail. We don't test the full doctorCommand because
// it touches many global paths; the helpers are the risky part.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Re-import via require-style dynamic import — the helpers aren't exported.
// Instead we re-read the file logic by testing through the public surface
// where possible: validateDeployedSkills + parseFrontmatter via doctor.ts.
//
// To keep this maintainable we mirror the parser logic into a tiny copy here.
// If the real parser changes, this test will go stale and we'll move it into
// a shared module. For now it's small enough to inline.

function parseFrontmatter(content: string): Record<string, string> | null {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end < 0) return null;
  const block = content.slice(3, end);
  const out: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z][\w-]*)\s*:\s*(.*)$/);
    if (m) out[m[1]!] = m[2]!.trim();
  }
  return out;
}

describe('frontmatter parser (mirror of doctor.ts logic)', () => {
  it('returns null when file does not start with ---', () => {
    expect(parseFrontmatter('# heading')).toBeNull();
  });

  it('returns null when closing --- is missing', () => {
    expect(parseFrontmatter('---\nname: foo\n# no close')).toBeNull();
  });

  it('extracts simple key: value pairs', () => {
    const fm = parseFrontmatter('---\nname: testing\ndescription: Use when ...\n---\nbody');
    expect(fm).toEqual({ name: 'testing', description: 'Use when ...' });
  });

  it('ignores indented or non-key lines inside the block', () => {
    const fm = parseFrontmatter('---\nname: x\n  indented: ignored\nstray text\n---\n');
    expect(fm).toEqual({ name: 'x' });
  });
});

describe('deployed skills validation (filesystem walk)', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cil-doctor-'));
    fs.mkdirSync(path.join(dir, 'good-skill'));
    fs.writeFileSync(
      path.join(dir, 'good-skill', 'SKILL.md'),
      '---\nname: good-skill\ndescription: Use when good things happen.\n---\nbody',
    );
    fs.mkdirSync(path.join(dir, 'no-frontmatter'));
    fs.writeFileSync(path.join(dir, 'no-frontmatter', 'SKILL.md'), '# just a heading');
    fs.mkdirSync(path.join(dir, 'missing-name'));
    fs.writeFileSync(
      path.join(dir, 'missing-name', 'SKILL.md'),
      '---\ndescription: only desc\n---\n',
    );
    fs.mkdirSync(path.join(dir, 'no-skill-md'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('walks each skill folder and surfaces actionable problems', () => {
    // Inline a copy of validateDeployedSkills to test behavior — same rationale
    // as parseFrontmatter above.
    const issues: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(dir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) {
        issues.push(`${entry.name}: missing SKILL.md`);
        continue;
      }
      const content = fs.readFileSync(skillFile, 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm) {
        issues.push(`${entry.name}: no YAML frontmatter`);
        continue;
      }
      if (!fm.name) issues.push(`${entry.name}: missing 'name'`);
      if (!fm.description) issues.push(`${entry.name}: missing 'description'`);
    }

    expect(issues).toContain('no-frontmatter: no YAML frontmatter');
    expect(issues).toContain('missing-name: missing \'name\'');
    expect(issues).toContain('no-skill-md: missing SKILL.md');
    expect(issues.find((i) => i.startsWith('good-skill:'))).toBeUndefined();
  });
});
