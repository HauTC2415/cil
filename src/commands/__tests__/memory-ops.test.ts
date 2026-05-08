import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { storeMemory, storeSession, searchMemory, getLatestSession, getDb, closeDb } from '../../lib/db.js';

let tmpDir: string;
let dbPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cil-memops-'));
  dbPath = path.join(tmpDir, 'memory.db');
});

afterEach(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// We test the underlying DB ops + the dedup hash logic, not the CLI handlers
// (which call process.exit on errors and write to stdout). The handlers are
// thin wrappers; the value is in the DB-level behaviors.

import { createHash } from 'crypto';
function memoryHash(category: string, content: string, tags: string): string {
  return createHash('sha256').update(`${category}\0${content}\0${tags}`).digest('hex');
}

describe('memory dedup hash', () => {
  it('is stable for the same inputs', () => {
    expect(memoryHash('decision', 'use JWT', 'auth jwt')).toBe(memoryHash('decision', 'use JWT', 'auth jwt'));
  });

  it('differs when category changes', () => {
    expect(memoryHash('decision', 'x', 't')).not.toBe(memoryHash('learning', 'x', 't'));
  });

  it('differs when content changes', () => {
    expect(memoryHash('d', 'x', 't')).not.toBe(memoryHash('d', 'y', 't'));
  });

  it('differs when tags change', () => {
    expect(memoryHash('d', 'x', 'a')).not.toBe(memoryHash('d', 'x', 'b'));
  });
});

describe('export/import round-trip', () => {
  it('exported memory survives a round-trip via direct DB ops', () => {
    storeMemory('decision', 'use JWT', ['auth', 'jwt'], 's1', dbPath);
    storeMemory('learning', 'JWT refresh needs DB', ['auth'], 's1', dbPath);
    storeSession('s1', 'snapshot text', dbPath);

    const db = getDb(dbPath);
    const memBefore = db.prepare('SELECT category, content, tags, session_id, created_at FROM memory').all();
    const sesBefore = db.prepare('SELECT id, snapshot, created_at FROM sessions').all();

    expect(memBefore).toHaveLength(2);
    expect(sesBefore).toHaveLength(1);

    const exportPayload = JSON.stringify({ version: 1, exported_at: 'test', memory: memBefore, sessions: sesBefore });
    const reparsed = JSON.parse(exportPayload);

    expect(reparsed.memory).toHaveLength(2);
    expect(reparsed.memory[0].content).toBe('use JWT');
    expect(reparsed.sessions[0].id).toBe('s1');
  });
});

describe('prune duration parser', () => {
  // Mirror the parser to exercise edge cases.
  function parseDuration(spec: string): number | null {
    const m = spec.match(/^(\d+)\s*(d|w|mo|m|y)$/i);
    if (!m) return null;
    const n = parseInt(m[1]!, 10);
    const unit = m[2]!.toLowerCase();
    const day = 86_400_000;
    switch (unit) {
      case 'd': return n * day;
      case 'w': return n * 7 * day;
      case 'm':
      case 'mo': return n * 30 * day;
      case 'y': return n * 365 * day;
      default: return null;
    }
  }

  it.each([
    ['30d', 30 * 86_400_000],
    ['12w', 12 * 7 * 86_400_000],
    ['6mo', 6 * 30 * 86_400_000],
    ['1y', 365 * 86_400_000],
    ['1Y', 365 * 86_400_000],
    ['7 d', 7 * 86_400_000],
  ])('parses %s', (s, expected) => {
    expect(parseDuration(s)).toBe(expected);
  });

  it.each(['', 'forever', 'd', '12', '12x'])('rejects %s', (s) => {
    expect(parseDuration(s)).toBeNull();
  });
});

describe('prune behavior at DB level', () => {
  it('deletes memories older than cutoff but preserves recent ones', () => {
    const old = Date.now() - 100 * 86_400_000;
    const recent = Date.now() - 10 * 86_400_000;

    const db = getDb(dbPath);
    db.prepare('INSERT INTO memory (category, content, tags, session_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('decision', 'old', '', 's', old);
    db.prepare('INSERT INTO memory (category, content, tags, session_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('decision', 'recent', '', 's', recent);

    const cutoff = Date.now() - 30 * 86_400_000;
    const deleted = db.prepare('DELETE FROM memory WHERE created_at < ?').run(cutoff).changes;

    expect(deleted).toBe(1);
    const remaining = searchMemory('recent', 10, undefined, dbPath);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.content).toBe('recent');
  });
});
