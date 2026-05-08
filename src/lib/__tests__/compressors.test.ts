import { describe, it, expect } from 'vitest';
import { detectTool, compress } from '../compress.js';
import { compressGit } from '../compressors/git.js';
import { compressNpm } from '../compressors/npm.js';
import { compressPytest } from '../compressors/pytest.js';
import { compressDocker } from '../compressors/docker.js';
import { compressCargo } from '../compressors/cargo.js';
import { compressTsc } from '../compressors/tsc.js';
import { compressPip } from '../compressors/pip.js';

describe('detectTool', () => {
  it('detects git from `diff --git` header', () => {
    const sample = 'diff --git a/foo.ts b/foo.ts\nindex abc..def 100644';
    expect(detectTool(sample)).toBe('git');
  });

  it('detects git from `commit <sha>` line', () => {
    expect(detectTool('commit a1b2c3d4e5f6\nAuthor: x')).toBe('git');
  });

  it('detects npm from WARN/ERR lines', () => {
    expect(detectTool('npm WARN deprecated foo@1.0.0 use bar')).toBe('npm');
    expect(detectTool('added 42 packages in 3s')).toBe('npm');
  });

  it('detects pytest from session header', () => {
    expect(detectTool('===== test session starts =====')).toBe('pytest');
    expect(detectTool('===== 5 passed in 0.42s =====')).toBe('pytest');
  });

  it('falls back to generic for unknown output', () => {
    expect(detectTool('just some random output\nlines')).toBe('generic');
  });

  it('detects docker from build/pull markers', () => {
    expect(detectTool('Step 3/12 : RUN apt-get update')).toBe('docker');
    expect(detectTool('a1b2c3d4e5f6: Pulling fs layer')).toBe('docker');
  });

  it('detects cargo from Compiling lines or rust error codes', () => {
    expect(detectTool('   Compiling serde v1.0.197')).toBe('cargo');
    expect(detectTool('error[E0382]: borrow of moved value: `x`')).toBe('cargo');
  });

  it('detects tsc from TS error formats', () => {
    expect(detectTool('src/foo.ts(12,3): error TS2322: Type \'x\' is not assignable')).toBe('tsc');
    expect(detectTool('src/foo.ts:12:3 - error TS2322: Type \'x\'')).toBe('tsc');
    expect(detectTool('Found 5 errors in 3 files.')).toBe('tsc');
  });

  it('detects pip from Collecting / Requirement already satisfied', () => {
    expect(detectTool('Collecting requests')).toBe('pip');
    expect(detectTool('Requirement already satisfied: certifi in /usr/local')).toBe('pip');
  });
});

describe('compressGit', () => {
  it('drops `index abc..def` metadata lines', () => {
    const input = 'diff --git a/foo.ts b/foo.ts\nindex 1234567..89abcde 100644\n--- a/foo.ts\n+++ b/foo.ts';
    const out = compressGit(input);
    expect(out).not.toContain('index 1234567..89abcde');
    expect(out).toContain('diff --git a/foo.ts b/foo.ts');
  });

  it('drops "\\ No newline at end of file" markers', () => {
    const input = 'real diff line\n\\ No newline at end of file\nanother';
    const out = compressGit(input);
    expect(out).not.toContain('No newline');
  });
});

describe('compressNpm', () => {
  it('dedupes repeated deprecation warnings for the same package', () => {
    const input = [
      'npm WARN deprecated foo@1.0.0 use bar',
      'npm WARN deprecated foo@1.0.0 use bar',
      'npm WARN deprecated foo@1.0.0 use bar',
      'added 5 packages',
    ].join('\n');
    const out = compressNpm(input);
    const occurrences = out.match(/npm WARN deprecated foo/g) ?? [];
    expect(occurrences.length).toBe(1);
    expect(out).toContain('suppressed 2 duplicate');
  });

  it('keeps unique deprecations', () => {
    const input = [
      'npm WARN deprecated foo@1.0.0',
      'npm WARN deprecated bar@2.0.0',
    ].join('\n');
    const out = compressNpm(input);
    expect(out).toContain('foo@1.0.0');
    expect(out).toContain('bar@2.0.0');
  });
});

describe('compressPytest', () => {
  it('keeps FAILED + summary in ultra mode, drops verbose passes', () => {
    const input = [
      'test_a.py::test_one PASSED',
      'test_b.py::test_two PASSED',
      '===== FAILURES =====',
      '_____ test_three _____',
      'AssertionError: expected X',
      '===== short test summary info =====',
      'FAILED test_c.py::test_three',
      '===== 2 passed, 1 failed in 0.42s =====',
    ].join('\n');
    const out = compressPytest(input, 150, 'ultra');
    expect(out).toContain('FAILURES');
    expect(out).toContain('AssertionError');
    expect(out).toContain('FAILED test_c.py');
    expect(out).toContain('2 passed, 1 failed');
    expect(out).not.toContain('test_a.py::test_one PASSED');
  });

  it('full mode preserves PASSED entries', () => {
    const input = 'test_a.py::test_one PASSED\ntest_b.py::test_two PASSED';
    const out = compressPytest(input, 150, 'full');
    expect(out).toContain('PASSED');
  });
});

describe('compressDocker', () => {
  it('collapses layer pull progress', () => {
    const input = [
      'a1b2c3d4e5f6: Pulling fs layer',
      'b2c3d4e5f6a1: Pulling fs layer',
      'c3d4e5f6a1b2: Pulling fs layer',
      'a1b2c3d4e5f6: Pull complete',
      'b2c3d4e5f6a1: Pull complete',
      'real signal here',
    ].join('\n');
    const out = compressDocker(input);
    expect(out).toContain('layer(s) pulling/pulled');
    expect(out).toContain('real signal here');
    expect(out).not.toContain('a1b2c3d4e5f6:');
  });

  it('drops intermediate image hashes and cache markers', () => {
    const input = 'Step 3/5 : RUN echo hi\n ---> abcdef123456\n ---> Using cache\n ---> def456abcdef\nStep 4/5 : COPY foo .';
    const out = compressDocker(input);
    expect(out).not.toContain('---> abcdef');
    expect(out).not.toContain('Using cache');
    expect(out).toContain('Step 3/5');
    expect(out).toContain('Step 4/5');
  });
});

describe('compressCargo', () => {
  it('drops Compiling/Checking lines but preserves errors and warnings', () => {
    const input = [
      '   Compiling serde v1.0.197',
      '   Compiling tokio v1.36.0',
      '   Checking my_crate v0.1.0 (/repo)',
      'warning: unused variable `x`',
      'error[E0382]: borrow of moved value: `y`',
      '   Finished `dev` profile [unoptimized + debuginfo] target(s) in 12.34s',
    ].join('\n');
    const out = compressCargo(input);
    expect(out).not.toContain('Compiling serde');
    expect(out).not.toContain('Checking my_crate');
    expect(out).toContain('warning: unused variable');
    expect(out).toContain('error[E0382]');
    expect(out).toContain('compiled/checked 3 crate(s)');
  });
});

describe('compressTsc', () => {
  it('keeps first occurrence of each (file, code), summarizes the rest', () => {
    const input = [
      'src/foo.ts(1,1): error TS2322: a',
      'src/foo.ts(2,1): error TS2322: b',
      'src/foo.ts(3,1): error TS2322: c',
      'src/foo.ts(4,1): error TS2304: missing',
      'src/bar.ts(1,1): error TS2322: x',
    ].join('\n');
    const out = compressTsc(input);
    expect(out).toContain('src/foo.ts(1,1): error TS2322: a');
    expect(out).not.toContain('src/foo.ts(2,1)');
    expect(out).toContain('src/foo.ts(4,1): error TS2304');
    expect(out).toContain('src/bar.ts(1,1): error TS2322');
    expect(out).toContain('src/foo.ts: TS2322×2 additional');
  });

  it('passes through non-error lines unchanged', () => {
    const input = 'building...\nFound 0 errors.';
    const out = compressTsc(input);
    expect(out).toContain('building');
    expect(out).toContain('Found 0 errors');
  });
});

describe('compressPip', () => {
  it('dedupes Requirement already satisfied into a count', () => {
    const input = [
      'Requirement already satisfied: certifi in /usr/local/lib/python3.11/site-packages (2024.2.2)',
      'Requirement already satisfied: charset-normalizer in /usr/local/lib/python3.11/site-packages (3.3.2)',
      'Requirement already satisfied: idna in /usr/local/lib/python3.11/site-packages (3.6)',
      'Successfully installed requests-2.31.0',
    ].join('\n');
    const out = compressPip(input);
    expect(out).toContain('3 requirement(s) already satisfied');
    expect(out).toContain('Successfully installed');
    expect(out).not.toContain('certifi in /usr/local');
  });

  it('collapses Collecting noise', () => {
    const input = [
      'Collecting requests',
      'Collecting urllib3<3,>=1.21.1',
      'Collecting charset-normalizer<4,>=2',
      'Successfully installed',
    ].join('\n');
    const out = compressPip(input);
    expect(out).toContain('collecting 3 package(s)');
    expect(out).not.toContain('Collecting requests');
  });
});

describe('compress dispatcher', () => {
  it('routes git output through git compressor', () => {
    const input = 'diff --git a/x.ts b/x.ts\nindex 1234567..89abcde 100644\n--- a/x.ts';
    const out = compress(input);
    expect(out).not.toContain('index 1234567..89abcde');
  });

  it('routes npm output through npm compressor', () => {
    const input = [
      'npm WARN deprecated foo@1.0.0',
      'npm WARN deprecated foo@1.0.0',
    ].join('\n');
    const out = compress(input);
    expect(out).toContain('suppressed');
  });

  it('explicit tool override wins over detection', () => {
    const input = 'diff --git a/x.ts b/x.ts\nindex 1234567..89abcde 100644';
    const out = compress(input, 150, 'full', 'generic');
    // generic does NOT strip the index line
    expect(out).toContain('index 1234567..89abcde');
  });
});
