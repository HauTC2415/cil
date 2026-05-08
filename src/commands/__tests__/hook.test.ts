import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  rewriteBashForCompression,
  extractKeywords,
  selectMemoriesForCompact,
  isErrorResponse,
  checkTranscriptSize,
  buildPostToolUseOutput,
} from '../hook.js';
import type { MemoryEntry } from '../../lib/db.js';

describe('rewriteBashForCompression', () => {
  it('wraps a known-verbose command in cil compress (no flag = default full)', () => {
    expect(rewriteBashForCompression('git diff HEAD~1')).toBe(
      '(git diff HEAD~1) 2>&1 | cil compress',
    );
  });

  it('returns null for trivial commands in SAFE_NO_COMPRESS', () => {
    expect(rewriteBashForCompression('echo hello')).toBeNull();
    expect(rewriteBashForCompression('mkdir foo')).toBeNull();
    expect(rewriteBashForCompression('cd src')).toBeNull();
    expect(rewriteBashForCompression('rm tmp.txt')).toBeNull();
    expect(rewriteBashForCompression('chmod +x script.sh')).toBeNull();
    expect(rewriteBashForCompression('export FOO=bar')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(rewriteBashForCompression('')).toBeNull();
  });

  it('skips commands already piping through cil compress', () => {
    const cmd = 'git log | cil compress';
    expect(rewriteBashForCompression(cmd)).toBeNull();
  });

  it('preserves nested pipes and semicolons via subshell', () => {
    const cmd = 'git diff HEAD~1 ; git status';
    const out = rewriteBashForCompression(cmd);
    expect(out).toBe('(git diff HEAD~1 ; git status) 2>&1 | cil compress');
  });

  it('produces JSON-safe output for various verbose commands', () => {
    const samples = ['npm test', 'pytest tests/', 'cargo build', 'find . -name "*.ts"'];
    for (const cmd of samples) {
      const out = rewriteBashForCompression(cmd);
      expect(out).not.toBeNull();
      expect(() => JSON.parse(JSON.stringify({ command: out }))).not.toThrow();
    }
  });

  it('uses ultra mode for pytest', () => {
    expect(rewriteBashForCompression('pytest tests/')).toContain('--mode=ultra');
    expect(rewriteBashForCompression('python -m pytest')).toContain('--mode=ultra');
  });

  it('uses ultra mode for npm test / install', () => {
    expect(rewriteBashForCompression('npm test')).toContain('--mode=ultra');
    expect(rewriteBashForCompression('npm install')).toContain('--mode=ultra');
    expect(rewriteBashForCompression('npm run test:unit')).toContain('--mode=ultra');
  });

  it('uses default (full) mode for git diff/log — no flag', () => {
    const out = rewriteBashForCompression('git diff HEAD~1');
    expect(out).not.toContain('--mode=');
  });

  it('uses ultra mode for cargo and pip install', () => {
    expect(rewriteBashForCompression('cargo build')).toContain('--mode=ultra');
    expect(rewriteBashForCompression('cargo test')).toContain('--mode=ultra');
    expect(rewriteBashForCompression('pip install -r requirements.txt')).toContain('--mode=ultra');
  });

  it('uses default (full) mode for git/find/ls — no flag', () => {
    expect(rewriteBashForCompression('git diff HEAD~1')).not.toContain('--mode=');
    expect(rewriteBashForCompression('find . -name "*.ts"')).not.toContain('--mode=');
  });

  it('wraps unknown commands in lite mode (Item 2 expansion)', () => {
    expect(rewriteBashForCompression('./scripts/deploy.sh')).toBe(
      '(./scripts/deploy.sh) 2>&1 | cil compress --mode=lite',
    );
    expect(rewriteBashForCompression('node app.js')).toBe(
      '(node app.js) 2>&1 | cil compress --mode=lite',
    );
    expect(rewriteBashForCompression('python script.py')).toBe(
      '(python script.py) 2>&1 | cil compress --mode=lite',
    );
    expect(rewriteBashForCompression('curl https://example.com')).toBe(
      '(curl https://example.com) 2>&1 | cil compress --mode=lite',
    );
  });

  it('uses ultra mode for jest/vitest', () => {
    expect(rewriteBashForCompression('jest --watch')).toContain('--mode=ultra');
    expect(rewriteBashForCompression('vitest run')).toContain('--mode=ultra');
  });

  it('uses full mode for eslint/tsc/make/mvn', () => {
    expect(rewriteBashForCompression('eslint src/')).toBe('(eslint src/) 2>&1 | cil compress');
    expect(rewriteBashForCompression('tsc --noEmit')).toBe('(tsc --noEmit) 2>&1 | cil compress');
    expect(rewriteBashForCompression('make build')).toBe('(make build) 2>&1 | cil compress');
    expect(rewriteBashForCompression('mvn install')).toBe('(mvn install) 2>&1 | cil compress');
  });

  it('handles long echo (>80 chars) by wrapping (not in SAFE_NO_COMPRESS)', () => {
    const longEcho = 'echo ' + 'x'.repeat(100);
    expect(rewriteBashForCompression(longEcho)).not.toBeNull();
  });
});

describe('extractKeywords (PreCompact relevance)', () => {
  it('drops short tokens and stopwords', () => {
    const out = extractKeywords(['edited: src/auth/login.ts', 'bash: npm test', 'tool=Edit']);
    expect(out).not.toContain('edit');
    expect(out).not.toContain('tool');
    expect(out).not.toContain('npm');  // < 4 chars
    expect(out).not.toContain('src');  // < 4 chars
  });

  it('keeps domain words', () => {
    const out = extractKeywords(['edited src/auth/login.ts', 'bash: jwt token validation']);
    expect(out).toContain('auth');
    expect(out).toContain('login');
    expect(out).toContain('token');
    expect(out).toContain('validation');
  });

  it('caps at max', () => {
    const text = ['alpha beta gamma delta epsilon zeta eta theta iota kappa'];
    expect(extractKeywords(text, 3)).toHaveLength(3);
  });

  it('returns empty for noisy/empty input', () => {
    expect(extractKeywords([])).toEqual([]);
    expect(extractKeywords(['', '   ', 'a b c'])).toEqual([]);
  });
});

describe('selectMemoriesForCompact (relevance ranking)', () => {
  const mk = (cat: string, content: string, created_at = Date.now()): MemoryEntry => ({
    category: cat,
    content,
    tags: '',
    session_id: 's1',
    created_at,
  });

  it('falls back to recency when no recent activity keywords', () => {
    const recent = [mk('decision', 'fallback decision')];
    const result = selectMemoriesForCompact([], () => recent, () => []);
    expect(result).toEqual(recent);
  });

  it('prefers FTS-relevant memories over recency when keywords match', () => {
    const recencyOrder = [
      mk('learning', 'unrelated newer thing', Date.now()),
      mk('decision', 'OAuth login chosen', Date.now() - 100_000),
    ];
    const ftsResult = [mk('decision', 'OAuth login chosen')];

    const out = selectMemoriesForCompact(
      ['edited src/oauth/login.ts'],
      () => recencyOrder,
      (q, n) => {
        expect(q).toContain('oauth');
        expect(n).toBeGreaterThan(0);
        return ftsResult;
      },
    );

    expect(out[0]?.content).toBe('OAuth login chosen');
  });

  it('tops up with recency when FTS returns fewer than limit', () => {
    const fallback = [
      mk('learning', 'fallback A'),
      mk('learning', 'fallback B'),
      mk('learning', 'fallback C'),
    ];
    const fts = [mk('decision', 'auth picked')];

    const out = selectMemoriesForCompact(
      ['edited auth.ts'],
      () => fallback,
      () => fts,
      3,
    );

    expect(out).toHaveLength(3);
    expect(out[0]?.content).toBe('auth picked');
    expect(out.slice(1).map((m) => m.content)).toEqual(['fallback A', 'fallback B']);
  });

  it('falls back when FTS throws (malformed query)', () => {
    const fallback = [mk('decision', 'safe fallback')];
    const out = selectMemoriesForCompact(
      ['edited foo.ts'],
      () => fallback,
      () => {
        throw new Error('FTS5 query syntax');
      },
    );
    expect(out[0]?.content).toBe('safe fallback');
  });
});

describe('checkTranscriptSize', () => {
  let tmpDir: string;
  let transcriptPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cil-hook-'));
    transcriptPath = path.join(tmpDir, 'transcript.jsonl');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when path is undefined', () => {
    expect(checkTranscriptSize(undefined)).toBeNull();
  });

  it('returns null when file does not exist', () => {
    expect(checkTranscriptSize(path.join(tmpDir, 'missing.jsonl'))).toBeNull();
  });

  it('returns bytes and exceeded=false when below threshold', () => {
    fs.writeFileSync(transcriptPath, 'x'.repeat(500));
    const r = checkTranscriptSize(transcriptPath, 1000);
    expect(r).toEqual({ bytes: 500, exceeded: false });
  });

  it('returns exceeded=true when at or above threshold', () => {
    fs.writeFileSync(transcriptPath, 'x'.repeat(2000));
    const r = checkTranscriptSize(transcriptPath, 1000);
    expect(r?.exceeded).toBe(true);
    expect(r?.bytes).toBe(2000);
  });
});

describe('buildPostToolUseOutput', () => {
  const base = {
    consecutiveErrors: 0,
    errorWarnFired: false,
    errorEscalateFired: false,
    transcriptBytes: null,
    transcriptWarnFired: false,
    threshold: 500_000,
  };

  it('returns null when nothing to warn about', () => {
    expect(buildPostToolUseOutput(base)).toBeNull();
  });

  it('emits tier-1 warning at exactly 3 consecutive errors', () => {
    const out = buildPostToolUseOutput({ ...base, consecutiveErrors: 3 });
    expect(out?.systemMessage).toContain('3 consecutive tool errors');
    expect(out?.hookSpecificOutput?.additionalContext).toContain('Stop iterating');
    expect(out?.hookSpecificOutput?.hookEventName).toBe('PostToolUse');
  });

  it('does not re-emit tier-1 once the marker has fired', () => {
    const out = buildPostToolUseOutput({
      ...base,
      consecutiveErrors: 4,
      errorWarnFired: true,
    });
    expect(out).toBeNull();
  });

  it('emits tier-2 escalation at 6+ errors', () => {
    const out = buildPostToolUseOutput({
      ...base,
      consecutiveErrors: 6,
      errorWarnFired: true, // tier 1 already fired
    });
    expect(out?.systemMessage).toContain('6+');
    expect(out?.hookSpecificOutput?.additionalContext).toContain('STOP');
  });

  it('does not re-emit tier-2 once escalated', () => {
    const out = buildPostToolUseOutput({
      ...base,
      consecutiveErrors: 9,
      errorWarnFired: true,
      errorEscalateFired: true,
    });
    expect(out).toBeNull();
  });

  it('emits transcript warning when bytes exceed threshold', () => {
    const out = buildPostToolUseOutput({
      ...base,
      transcriptBytes: 600_000,
      threshold: 500_000,
    });
    expect(out?.systemMessage).toContain('KB');
    expect(out?.hookSpecificOutput?.additionalContext).toContain('/compact');
  });

  it('does not re-emit transcript warning once fired', () => {
    const out = buildPostToolUseOutput({
      ...base,
      transcriptBytes: 600_000,
      threshold: 500_000,
      transcriptWarnFired: true,
    });
    expect(out).toBeNull();
  });

  it('combines error and transcript warnings in one output', () => {
    const out = buildPostToolUseOutput({
      ...base,
      consecutiveErrors: 3,
      transcriptBytes: 600_000,
      threshold: 500_000,
    });
    expect(out?.systemMessage).toContain('3 consecutive tool errors');
    expect(out?.systemMessage).toContain('KB');
    expect(out?.hookSpecificOutput?.additionalContext).toContain('Stop iterating');
    expect(out?.hookSpecificOutput?.additionalContext).toContain('/compact');
  });
});

describe('isErrorResponse', () => {
  it('returns false for undefined or empty response', () => {
    expect(isErrorResponse(undefined)).toBe(false);
    expect(isErrorResponse({})).toBe(false);
  });

  it('detects is_error: true (Claude Code Bash/Edit/Write convention)', () => {
    expect(isErrorResponse({ is_error: true })).toBe(true);
    expect(isErrorResponse({ is_error: false })).toBe(false);
  });

  it('detects non-empty string error field', () => {
    expect(isErrorResponse({ error: 'EACCES' })).toBe(true);
    expect(isErrorResponse({ error: '' })).toBe(false);
  });

  it('detects non-zero exit_code', () => {
    expect(isErrorResponse({ exit_code: 1 })).toBe(true);
    expect(isErrorResponse({ exit_code: 127 })).toBe(true);
    expect(isErrorResponse({ exit_code: 0 })).toBe(false);
  });

  it('treats normal successful response as non-error', () => {
    expect(isErrorResponse({ output: 'ok', is_error: false })).toBe(false);
    expect(isErrorResponse({ stdout: 'done', exit_code: 0 })).toBe(false);
  });

  it('does not flag error when only stderr is present (build can succeed with stderr)', () => {
    expect(isErrorResponse({ stderr: 'warning: deprecated', exit_code: 0 })).toBe(false);
  });
});
