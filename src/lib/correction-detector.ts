// Detects when a user prompt is correcting prior agent behavior. Used by the
// UserPromptSubmit hook to capture "feedback" memories automatically — so a
// future session honors the same guidance without the user re-stating it.
//
// Pro-workflow philosophy: persistent corrective memory — correct the AI once,
// it never makes the same mistake twice.

export interface CorrectionDetection {
  isCorrection: boolean;
  rule?: string;
  confidence: 'low' | 'medium' | 'high';
}

const CORRECTION_PATTERNS: Array<{ re: RegExp; confidence: 'low' | 'medium' | 'high' }> = [
  // Direct prohibition + any verb
  { re: /\b(don'?t|do not|never|stop|quit)\s+\w+/i, confidence: 'high' },
  // Replacement directives
  { re: /\b(instead of|rather than|use\s+\S+\s+instead)\b/i, confidence: 'high' },
  // "no, ... wrong"
  { re: /\bno,\s.+\b(wrong|incorrect|not right)\b/i, confidence: 'high' },
  // Soft preferences
  { re: /\b(prefer|always)\s+(\w+ing|use|do|run)/i, confidence: 'medium' },
  { re: /\b(from now on|going forward|next time)\b/i, confidence: 'medium' },
  { re: /\b(that'?s wrong|you'?re wrong|incorrect|that'?s not right)\b/i, confidence: 'medium' },
];

const MAX_RULE_LENGTH = 240;

export function detectCorrection(prompt: string): CorrectionDetection {
  if (!prompt || prompt.length < 4) {
    return { isCorrection: false, confidence: 'low' };
  }

  const trimmed = prompt.trim();

  for (const { re, confidence } of CORRECTION_PATTERNS) {
    if (re.test(trimmed)) {
      return {
        isCorrection: true,
        rule: trimmed.slice(0, MAX_RULE_LENGTH),
        confidence,
      };
    }
  }

  return { isCorrection: false, confidence: 'low' };
}
