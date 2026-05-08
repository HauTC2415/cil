import { describe, it, expect } from 'vitest';
import { compress, isVerboseCommand, selectMode } from '../compress.js';

function stripAnnotation(s: string): string {
  return s.replace(/\n*\[compressed \d+% — \d+ → \d+ lines\]$/, '');
}

describe('selectMode', () => {
  it.each([
    ['cd src', 'skip'],
    ['mkdir foo', 'skip'],
    ['echo hello', 'skip'],
    ['export FOO=bar', 'skip'],
    ['', 'skip'],
    ['pytest tests/', 'ultra'],
    ['npm test', 'ultra'],
    ['npm install', 'ultra'],
    ['cargo test', 'ultra'],
    ['vitest run', 'ultra'],
    ['jest', 'ultra'],
    ['go test ./...', 'ultra'],
    ['git diff HEAD~1', 'full'],
    ['npm run build', 'full'],
    ['docker build .', 'full'],
    ['eslint src/', 'full'],
    ['make install', 'full'],
    ['mvn package', 'full'],
    ['tsc --noEmit', 'full'],
    ['./scripts/deploy.sh', 'lite'],
    ['node app.js', 'lite'],
    ['python script.py', 'lite'],
    ['curl https://example.com', 'lite'],
    ['terraform plan', 'lite'],
  ])('%s -> %s', (cmd, expected) => {
    expect(selectMode(cmd)).toBe(expected);
  });
});

describe('isVerboseCommand', () => {
  it.each([
    ['git diff', true],
    ['git log --oneline', true],
    ['npm install', true],
    ['npm test', true],
    ['pytest tests/', true],
    ['cargo build', true],
    ['ls -la', true],
    ['echo hello', false],
    ['cd src', false],
    ['mkdir foo', false],
  ])('%s -> %s', (cmd, expected) => {
    expect(isVerboseCommand(cmd)).toBe(expected);
  });
});

describe('compress — Pillar 1 (filter)', () => {
  it('strips ANSI escape codes', () => {
    const input = '\x1b[31mred text\x1b[0m\nplain';
    expect(stripAnnotation(compress(input))).toBe('red text\nplain');
  });

  it('removes empty lines', () => {
    const input = 'a\n\n\nb';
    expect(stripAnnotation(compress(input))).toBe('a\nb');
  });

  it('removes npm timing/verbose noise', () => {
    const input = 'npm timing fetch took 100ms\nreal output\nnpm verb something';
    expect(stripAnnotation(compress(input))).toBe('real output');
  });

  it('removes additional npm noise (sill, http fetch, notice)', () => {
    const input = [
      'npm sill idealTree buildDeps',
      'npm http fetch GET 200 https://registry.npmjs.org/foo',
      'npm notice created a lockfile',
      'real signal',
    ].join('\n');
    expect(stripAnnotation(compress(input))).toBe('real signal');
  });

  it('removes separator lines', () => {
    const input = '======\nactual\n------';
    expect(stripAnnotation(compress(input))).toBe('actual');
  });

  it('returns input unchanged for empty/whitespace', () => {
    expect(compress('')).toBe('');
    expect(compress('   ')).toBe('   ');
  });
});

describe('compress — Pillar 2 (deduplicate consecutive)', () => {
  it('collapses identical consecutive lines with ×N suffix', () => {
    const input = 'same\nsame\nsame\ndifferent';
    expect(compress(input)).toContain('same (×3)');
    expect(compress(input)).toContain('different');
  });

  it('keeps non-consecutive duplicates separate', () => {
    const input = 'a\nb\na';
    const out = compress(input);
    expect(out).not.toContain('×');
  });
});

describe('compress — Pillar 3 (group similar)', () => {
  it('groups warning/note prefixes', () => {
    const input = 'warning: foo\nwarning: bar\nwarning: baz';
    const out = compress(input);
    expect(out).toMatch(/warning:.*\(3 messages\)/);
  });

  it('collapses stack frames', () => {
    const input = '    at fn1 (file.js:1)\n    at fn2 (file.js:2)\n    at fn3 (file.js:3)';
    const out = compress(input);
    expect(out).toMatch(/3 stack frame/);
  });
});

describe('compress — Pillar 4 (truncate)', () => {
  it('truncates long output keeping head + tail', () => {
    const lines = Array.from({ length: 300 }, (_, i) => `line${i}`);
    const out = compress(lines.join('\n'), 100);
    expect(out).toContain('line0');
    expect(out).toContain('line299');
    expect(out).toContain('omitted');
  });

  it('does not truncate when under threshold', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line${i}`);
    const out = compress(lines.join('\n'), 100);
    expect(out).not.toContain('omitted');
  });

  it('does not truncate when only marginally over max (within 5-line tolerance)', () => {
    // 102 lines with max=100 — too small a saving to justify truncation overhead
    const lines = Array.from({ length: 102 }, (_, i) => `line${i}`);
    const out = compress(lines.join('\n'), 100);
    expect(out).not.toContain('omitted');
  });
});

describe('compress — graduated modes', () => {
  it('lite mode: only filters, does not deduplicate', () => {
    const input = 'same\nsame\nsame';
    const out = compress(input, 150, 'lite');
    // dedupe disabled, so we still see all three lines (or input unchanged)
    expect(out).not.toContain('×3');
    expect(out.split('\n').filter((l) => l === 'same')).toHaveLength(3);
  });

  it('full mode (default): deduplicates consecutive identical lines', () => {
    const input = 'same\nsame\nsame';
    const out = compress(input, 150, 'full');
    expect(out).toContain('×3');
  });

  it('ultra mode: collapses test PASS lines into a count', () => {
    const input = [
      'PASS test/foo.test.ts',
      'PASS test/bar.test.ts',
      'PASS test/baz.test.ts',
      'FAIL test/quux.test.ts',
    ].join('\n');
    const out = compress(input, 150, 'ultra');
    expect(out).toMatch(/✓ 3 passing test/);
    expect(out).toContain('FAIL test/quux.test.ts');
  });

  it('ultra mode reduces output more than full mode for repeated PASSes', () => {
    const input = Array.from({ length: 30 }, (_, i) => `PASS test/file${i}.ts`).join('\n');
    const fullOut = compress(input, 150, 'full');
    const ultraOut = compress(input, 150, 'ultra');
    expect(ultraOut.length).toBeLessThan(fullOut.length);
  });
});

describe('compress — output annotation', () => {
  it('appends compression ratio when reduction > 10%', () => {
    const input = Array(50).fill('duplicated line').join('\n');
    const out = compress(input);
    expect(out).toMatch(/\[compressed \d+%/);
  });

  it('skips ratio annotation for small reductions', () => {
    const input = 'one\ntwo\nthree';
    const out = compress(input);
    expect(out).not.toMatch(/\[compressed/);
  });
});
