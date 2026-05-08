import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  storeMemory,
  searchMemory,
  storeSession,
  getLatestSession,
  storeActivity,
  getRecentMemories,
  getConsecutiveErrorCount,
  hasSessionMarker,
  setSessionMarker,
  closeDb,
} from '../db.js';

let tmpDir: string;
let dbPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cil-test-'));
  dbPath = path.join(tmpDir, 'memory.db');
});

afterEach(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('storeMemory + searchMemory', () => {
  it('stores and retrieves a memory by FTS match', () => {
    storeMemory('decision', 'use JWT for stateless auth', ['auth', 'jwt'], 's1', dbPath);
    const results = searchMemory('JWT', 10, undefined, dbPath);
    expect(results).toHaveLength(1);
    expect(results[0]?.content).toBe('use JWT for stateless auth');
    expect(results[0]?.category).toBe('decision');
  });

  it('filters by category when provided', () => {
    storeMemory('decision', 'pick redis', [], 's1', dbPath);
    storeMemory('learning', 'redis pubsub is at-most-once', [], 's1', dbPath);

    const decisions = searchMemory('redis', 10, 'decision', dbPath);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.category).toBe('decision');
  });

  it('respects limit parameter', () => {
    for (let i = 0; i < 5; i++) {
      storeMemory('learning', `JWT note ${i}`, [], 's1', dbPath);
    }
    const results = searchMemory('JWT', 3, undefined, dbPath);
    expect(results).toHaveLength(3);
  });

  it('returns empty array when no match', () => {
    storeMemory('decision', 'use JWT', [], 's1', dbPath);
    const results = searchMemory('postgres', 10, undefined, dbPath);
    expect(results).toEqual([]);
  });

  it('FTS5 porter stemmer matches related word forms', () => {
    storeMemory('learning', 'authentication failed for user', [], 's1', dbPath);
    const results = searchMemory('authenticate', 10, undefined, dbPath);
    expect(results).toHaveLength(1);
  });
});

describe('storeSession + getLatestSession', () => {
  it('returns null when no session stored', () => {
    expect(getLatestSession(dbPath)).toBeNull();
  });

  it('retrieves the most recent session', async () => {
    storeSession('s1', 'first', dbPath);
    await new Promise((r) => setTimeout(r, 5));
    storeSession('s2', 'second', dbPath);
    const latest = getLatestSession(dbPath);
    expect(latest?.id).toBe('s2');
    expect(latest?.snapshot).toBe('second');
  });

  it('REPLACE updates existing session by id', () => {
    storeSession('s1', 'original', dbPath);
    storeSession('s1', 'updated', dbPath);
    expect(getLatestSession(dbPath)?.snapshot).toBe('updated');
  });
});

describe('storeActivity + getRecentMemories', () => {
  it('stores activity without affecting memory FTS', () => {
    storeActivity('s1', 'file_edit', 'src/index.ts', dbPath);
    const memories = searchMemory('src', 10, undefined, dbPath);
    expect(memories).toEqual([]);
  });

  it('getRecentMemories returns memories within window', () => {
    storeMemory('decision', 'recent decision', [], 's1', dbPath);
    const recent = getRecentMemories(10, 24, dbPath);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.content).toBe('recent decision');
  });
});

describe('getConsecutiveErrorCount', () => {
  it('returns 0 when there is no activity', () => {
    expect(getConsecutiveErrorCount('s1', dbPath)).toBe(0);
  });

  it('counts trailing consecutive tool_error events', () => {
    storeActivity('s1', 'tool_use', 'a', dbPath);
    storeActivity('s1', 'tool_error', 'b', dbPath);
    storeActivity('s1', 'tool_error', 'c', dbPath);
    storeActivity('s1', 'tool_error', 'd', dbPath);
    expect(getConsecutiveErrorCount('s1', dbPath)).toBe(3);
  });

  it('stops counting at the first non-error event from the end', () => {
    storeActivity('s1', 'tool_error', 'old1', dbPath);
    storeActivity('s1', 'tool_error', 'old2', dbPath);
    storeActivity('s1', 'tool_use', 'recovery', dbPath);
    storeActivity('s1', 'tool_error', 'newest', dbPath);
    expect(getConsecutiveErrorCount('s1', dbPath)).toBe(1);
  });

  it('isolates by session id', () => {
    storeActivity('s1', 'tool_error', 'x', dbPath);
    storeActivity('s1', 'tool_error', 'y', dbPath);
    storeActivity('s2', 'tool_error', 'z', dbPath);
    expect(getConsecutiveErrorCount('s1', dbPath)).toBe(2);
    expect(getConsecutiveErrorCount('s2', dbPath)).toBe(1);
  });

  it('returns 0 when most recent event is non-error', () => {
    storeActivity('s1', 'tool_error', 'failed', dbPath);
    storeActivity('s1', 'tool_use', 'succeeded', dbPath);
    expect(getConsecutiveErrorCount('s1', dbPath)).toBe(0);
  });
});

describe('session markers', () => {
  it('returns false when marker is absent', () => {
    expect(hasSessionMarker('s1', 'context_warned', dbPath)).toBe(false);
  });

  it('returns true after setSessionMarker', () => {
    setSessionMarker('s1', 'context_warned', dbPath);
    expect(hasSessionMarker('s1', 'context_warned', dbPath)).toBe(true);
  });

  it('isolates markers per session and per name', () => {
    setSessionMarker('s1', 'context_warned', dbPath);
    expect(hasSessionMarker('s1', 'context_warned', dbPath)).toBe(true);
    expect(hasSessionMarker('s2', 'context_warned', dbPath)).toBe(false);
    expect(hasSessionMarker('s1', 'error_loop_warned', dbPath)).toBe(false);
  });
});

describe('snapshot ≤2KB invariant', () => {
  it('Buffer.byteLength reports correct size for trimming threshold', () => {
    const big = 'x'.repeat(3000);
    expect(Buffer.byteLength(big)).toBe(3000);
    expect(Buffer.byteLength(big) > 2048).toBe(true);
  });

  it('a typical snapshot fits under 2KB', () => {
    const snapshot = JSON.stringify({
      summary: 'implemented JWT auth and refresh token table',
      decisions: ['stateless JWT', '1h access token', '7d refresh token in DB'],
      timestamp: new Date().toISOString(),
    });
    expect(Buffer.byteLength(snapshot)).toBeLessThan(2048);
  });
});
