import { describe, it, expect } from 'vitest';
import { detectCorrection } from '../correction-detector.js';

describe('detectCorrection', () => {
  it.each([
    ['stop using mocks in integration tests', 'high'],
    ["don't add comments to obvious code", 'high'],
    ['do not refactor adjacent code while fixing the bug', 'high'],
    ['never commit without running tests', 'high'],
    ['no, that is wrong, the test should hit a real db', 'high'],
    ['use vitest instead of jest', 'high'],
    ['rather than mocking, use a fake implementation', 'high'],
    ['from now on, prefer integration tests over unit', 'medium'],
    ['next time please ask before pushing', 'medium'],
    ['always run lint before commit', 'medium'],
    ["that's wrong, the import should be relative", 'medium'],
  ])('detects "%s" as a correction (%s confidence)', (prompt, conf) => {
    const result = detectCorrection(prompt);
    expect(result.isCorrection).toBe(true);
    expect(result.confidence).toBe(conf);
    expect(result.rule).toContain(prompt.slice(0, 30));
  });

  it.each([
    'add a new feature for X',
    'what does this function do?',
    'commit the changes',
    'run the tests',
    'fix the bug in the auth module',
    '',
    '   ',
  ])('does not flag normal prompt: "%s"', (prompt) => {
    const result = detectCorrection(prompt);
    expect(result.isCorrection).toBe(false);
  });

  it('truncates very long prompts to MAX_RULE_LENGTH', () => {
    const long = 'stop using mocks ' + 'x'.repeat(500);
    const result = detectCorrection(long);
    expect(result.isCorrection).toBe(true);
    expect(result.rule!.length).toBeLessThanOrEqual(240);
  });
});
