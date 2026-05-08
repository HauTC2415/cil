import fs from 'fs';
import path from 'path';
import {
  getRecentMemories,
  storeActivity,
  storeMemory,
  getLatestSession,
  getRecentActivityText,
  searchMemory,
  getConsecutiveErrorCount,
  hasSessionMarker,
  setSessionMarker,
  type MemoryEntry,
} from '../lib/db.js';
import { selectMode } from '../lib/compress.js';
import { detectCorrection } from '../lib/correction-detector.js';
import {
  CIL_HOME,
  HOOK_LOG_PATH,
  HOOK_LOG_MAX_BYTES,
  CONTEXT_WARN_BYTES,
} from '../lib/paths.js';

interface HookInput {
  session_id?: string;
  transcript_path?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  prompt?: string;
  [key: string]: unknown;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 200);
  });
}

function parseInput(raw: string): HookInput {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as HookInput;
  } catch {
    return {};
  }
}

// RTK-inspired: wrap every Bash command in `cil compress` so any
// surprise-verbose output (test runners, linters, custom scripts) is
// filtered before reaching Claude's context. Trivial commands listed in
// SAFE_NO_COMPRESS are skipped to avoid shell overhead.
//
// Mode selection (see selectMode in lib/compress):
//   ultra — test runners, package installers (semantic dedup pays off)
//   full  — known-verbose tools (git diff, docker, tsc, eslint, make…)
//   lite  — everything else (filter ANSI/noise only, no truncation)
export function rewriteBashForCompression(command: string): string | null {
  if (!command) return null;
  if (command.includes('cil compress')) return null;

  const mode = selectMode(command);
  if (mode === 'skip') return null;

  // `lite` is the default of `cil compress` so we omit the flag to keep the
  // rewritten command short.
  const flags = mode === 'lite' ? ' --mode=lite' : mode === 'ultra' ? ' --mode=ultra' : '';
  return `(${command}) 2>&1 | cil compress${flags}`;
}

// Claude Code PreToolUse hook: output JSON to modify the tool call
async function handlePreToolUse(input: HookInput): Promise<void> {
  if (input.tool_name !== 'Bash') return;

  const command = (input.tool_input?.['command'] as string) ?? '';
  const rewritten = rewriteBashForCompression(command);
  if (!rewritten) return;

  // Output modified tool_input — Claude Code uses this instead of the original
  process.stdout.write(JSON.stringify({ tool_input: { command: rewritten } }));
}

// Failed tool calls carry no forward value — they're what /rewind would
// discard. Skipping them keeps activity keywords clean (so PreCompact's
// relevance ranking isn't biased toward broken attempts) and prevents
// auto-capturing failed git commits as decisions.
export function isErrorResponse(response: Record<string, unknown> | undefined): boolean {
  if (!response) return false;
  if (response['is_error'] === true) return true;
  if (typeof response['error'] === 'string' && (response['error'] as string).length > 0) return true;
  const exit = response['exit_code'];
  if (typeof exit === 'number' && exit !== 0) return true;
  return false;
}

// Stat the Claude Code transcript file to estimate context-window fill.
// Returns null if the file is missing or unreadable so the caller skips
// gracefully (no hook should ever block on filesystem hiccups).
export function checkTranscriptSize(
  transcriptPath: string | undefined,
  threshold = CONTEXT_WARN_BYTES,
): { bytes: number; exceeded: boolean } | null {
  if (!transcriptPath) return null;
  try {
    const { size } = fs.statSync(transcriptPath);
    return { bytes: size, exceeded: size >= threshold };
  } catch {
    return null;
  }
}

interface PostToolUseOutput {
  systemMessage?: string;
  hookSpecificOutput?: {
    hookEventName: 'PostToolUse';
    additionalContext?: string;
  };
}

// Build the JSON output that Claude Code consumes for PostToolUse hooks.
// Returns null if there's nothing to emit (the common case).
export function buildPostToolUseOutput(args: {
  consecutiveErrors: number;
  errorWarnFired: boolean;
  errorEscalateFired: boolean;
  transcriptBytes: number | null;
  transcriptWarnFired: boolean;
  threshold: number;
}): PostToolUseOutput | null {
  const messages: string[] = [];
  const contexts: string[] = [];

  // Error-loop tier 1 — first time hitting 3 consecutive errors
  if (args.consecutiveErrors === 3 && !args.errorWarnFired) {
    messages.push(
      'CIL: 3 consecutive tool errors. Consider /compact to clear failed attempts from context.',
    );
    contexts.push(
      'Note: 3 consecutive tool errors. Stop iterating. Re-read the failing input, identify the root cause, propose a different approach. If context is bloated with failed attempts, ask the user to run /compact.',
    );
  }

  // Error-loop tier 2 — escalate at 6
  if (args.consecutiveErrors >= 6 && !args.errorEscalateFired) {
    messages.push(
      'CIL: 6+ consecutive tool errors. Stop and ask user before continuing.',
    );
    contexts.push(
      'Note: 6+ consecutive tool errors. STOP. Do not retry. Summarize what has been tried and ask the user how to proceed.',
    );
  }

  // Context-size warning — fires once per session
  if (
    args.transcriptBytes !== null &&
    args.transcriptBytes >= args.threshold &&
    !args.transcriptWarnFired
  ) {
    const kb = Math.round(args.transcriptBytes / 1024);
    messages.push(
      `CIL: transcript ~${kb} KB (>~70% typical context). Consider /compact.`,
    );
    contexts.push(
      `CIL: transcript is ~${kb} KB (>~70% of typical context window). Summarize the current task state in one paragraph, then ask the user to run /compact. Do not continue accumulating tool output.`,
    );
  }

  if (messages.length === 0 && contexts.length === 0) return null;

  const out: PostToolUseOutput = {};
  if (messages.length > 0) out.systemMessage = messages.join(' ');
  if (contexts.length > 0) {
    out.hookSpecificOutput = {
      hookEventName: 'PostToolUse',
      additionalContext: contexts.join('\n\n'),
    };
  }
  return out;
}

const ERROR_WARN_MARKER = 'error_loop_warned';
const ERROR_ESCALATE_MARKER = 'error_loop_escalated';
const CONTEXT_WARN_MARKER = 'context_warned';

async function handlePostToolUse(input: HookInput): Promise<void> {
  const sessionId = input.session_id ?? 'unknown';
  const toolName = input.tool_name ?? 'unknown';
  const isError = isErrorResponse(input.tool_response);

  // 1. Log activity event so getConsecutiveErrorCount can see the trail.
  if (isError) {
    storeActivity(sessionId, 'tool_error', `tool=${toolName}`);
  } else if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = (input.tool_input?.['file_path'] as string) ?? '';
    storeActivity(sessionId, 'file_edit', filePath);
  } else {
    let content = `tool=${toolName}`;
    if (toolName === 'Bash') {
      const cmd = (input.tool_input?.['command'] as string) ?? '';
      const summary = cmd.length > 100 ? cmd.slice(0, 100) + '…' : cmd;
      content = `bash: ${summary}`;
      if (/^git\s+commit/.test(cmd.trim())) {
        storeMemory('decision', `git commit: ${cmd.slice(0, 200)}`, ['git', 'commit'], sessionId);
      }
    }
    storeActivity(sessionId, 'tool_use', content);
  }

  // 2. Compute warning state.
  const consecutiveErrors = isError ? getConsecutiveErrorCount(sessionId) : 0;
  const transcriptInfo = checkTranscriptSize(input.transcript_path);
  const transcriptBytes = transcriptInfo?.bytes ?? null;

  const errorWarnFired = hasSessionMarker(sessionId, ERROR_WARN_MARKER);
  const errorEscalateFired = hasSessionMarker(sessionId, ERROR_ESCALATE_MARKER);
  const transcriptWarnFired = hasSessionMarker(sessionId, CONTEXT_WARN_MARKER);

  const output = buildPostToolUseOutput({
    consecutiveErrors,
    errorWarnFired,
    errorEscalateFired,
    transcriptBytes,
    transcriptWarnFired,
    threshold: CONTEXT_WARN_BYTES,
  });

  if (!output) return;

  // 3. Persist markers so each warning fires at most once per session.
  if (consecutiveErrors === 3 && !errorWarnFired) {
    setSessionMarker(sessionId, ERROR_WARN_MARKER);
  }
  if (consecutiveErrors >= 6 && !errorEscalateFired) {
    setSessionMarker(sessionId, ERROR_ESCALATE_MARKER);
  }
  if (
    transcriptBytes !== null &&
    transcriptBytes >= CONTEXT_WARN_BYTES &&
    !transcriptWarnFired
  ) {
    setSessionMarker(sessionId, CONTEXT_WARN_MARKER);
  }

  process.stdout.write(JSON.stringify(output));
}

// Tokenize text for FTS query: keep words ≥4 chars, lowercase, dedupe,
// drop common stopwords that bleed signal across topics.
const STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'have', 'been', 'will', 'tool', 'edit', 'edited',
  'file', 'bash', 'session', 'unknown', 'session_stop', 'tool_use', 'file_edit',
  'true', 'false', 'null', 'undefined', 'console', 'index', 'path',
]);

export function extractKeywords(texts: string[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of texts) {
    for (const raw of t.split(/[^a-zA-Z0-9_]+/)) {
      const w = raw.toLowerCase();
      if (w.length < 4) continue;
      if (STOPWORDS.has(w)) continue;
      if (seen.has(w)) continue;
      seen.add(w);
      out.push(w);
      if (out.length >= max) return out;
    }
  }
  return out;
}

// Choose memories to inject before compaction. If recent activity yields
// keywords, prefer FTS-relevant memories; otherwise fall back to recency.
export function selectMemoriesForCompact(
  recentTexts: string[],
  fallback: () => MemoryEntry[],
  search: (q: string, limit: number) => MemoryEntry[],
  limit = 15,
): MemoryEntry[] {
  const keywords = extractKeywords(recentTexts);
  if (keywords.length === 0) return fallback().slice(0, limit);

  const query = keywords.map((k) => `"${k}"`).join(' OR ');
  let relevant: MemoryEntry[] = [];
  try {
    relevant = search(query, limit);
  } catch {
    relevant = [];
  }

  if (relevant.length === 0) return fallback().slice(0, limit);

  // Top up with recency-only candidates if FTS returned few results.
  if (relevant.length < limit) {
    const seen = new Set(relevant.map((m) => m.created_at + '|' + m.content));
    for (const m of fallback()) {
      const key = m.created_at + '|' + m.content;
      if (!seen.has(key)) {
        relevant.push(m);
        seen.add(key);
        if (relevant.length >= limit) break;
      }
    }
  }

  return relevant.slice(0, limit);
}

async function handlePreCompact(_input: HookInput): Promise<void> {
  const recentActivity = getRecentActivityText(20, 6);
  const session = getLatestSession();

  const memories = selectMemoriesForCompact(
    recentActivity,
    () => {
      const recent = getRecentMemories(20, 72);
      const priority = recent.filter((m) => ['decision', 'constraint', 'architecture'].includes(m.category));
      const rest = recent.filter((m) => !['decision', 'constraint', 'architecture'].includes(m.category));
      return [...priority, ...rest];
    },
    (q, n) => searchMemory(q, n),
  );

  const lines: string[] = ['[CIL Memory — injected before compaction]'];

  if (session) {
    try {
      const data = JSON.parse(session.snapshot) as { summary: string; decisions?: string[] };
      lines.push('', `Last session: ${data.summary}`);
      if (data.decisions?.length) {
        lines.push('Decisions: ' + data.decisions.slice(0, 3).join(' | '));
      }
    } catch {
      lines.push('', session.snapshot);
    }
  }

  if (memories.length > 0) {
    lines.push('', 'Relevant context:');
    for (const m of memories) {
      lines.push(`- [${m.category}] ${m.content}`);
    }
  }

  const output = lines.join('\n');
  // Hard limit: 1800 bytes to leave room for Claude's own compact header
  process.stdout.write(output.length > 1800 ? output.slice(0, 1800) + '\n…' : output);
}

async function handleSessionStop(input: HookInput): Promise<void> {
  storeActivity(input.session_id ?? 'unknown', 'session_stop', 'session ended');
}

// Pro-workflow inspired: capture user corrections as "feedback" memories so
// future sessions honor the same guidance without restating it.
async function handleUserPromptSubmit(input: HookInput): Promise<void> {
  const prompt = input.prompt;
  if (!prompt || typeof prompt !== 'string') return;

  const detection = detectCorrection(prompt);
  if (!detection.isCorrection || !detection.rule) return;

  // Only auto-store medium/high confidence to avoid noise.
  if (detection.confidence === 'low') return;

  const sessionId = input.session_id ?? 'unknown';
  storeMemory('learning', `feedback: ${detection.rule}`, ['feedback', detection.confidence], sessionId);
}

// Append a line to ~/.cil/hook.log; never throws.
// Rotates by truncating to last half when file exceeds HOOK_LOG_MAX_BYTES.
function logHookError(event: string, err: unknown): void {
  try {
    fs.mkdirSync(CIL_HOME, { recursive: true });
    if (fs.existsSync(HOOK_LOG_PATH)) {
      const { size } = fs.statSync(HOOK_LOG_PATH);
      if (size > HOOK_LOG_MAX_BYTES) {
        const buf = fs.readFileSync(HOOK_LOG_PATH);
        fs.writeFileSync(HOOK_LOG_PATH, buf.subarray(Math.floor(size / 2)));
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    const line = `${new Date().toISOString()}\t${event}\t${msg.replace(/\s+/g, ' ').slice(0, 500)}\n`;
    fs.appendFileSync(HOOK_LOG_PATH, line);
  } catch {
    // Logging itself must never break the hook
  }
}

export async function hookCommand(event: string): Promise<void> {
  try {
    const raw = await readStdin();
    const input = parseInput(raw);

    switch (event) {
      case 'pre-tool-use':       await handlePreToolUse(input);       break;
      case 'post-tool-use':      await handlePostToolUse(input);      break;
      case 'pre-compact':        await handlePreCompact(input);       break;
      case 'session-stop':       await handleSessionStop(input);      break;
      case 'user-prompt-submit': await handleUserPromptSubmit(input); break;
      // Silent fail on unknown events — never block Claude Code
    }
  } catch (err) {
    // Hooks must never crash Claude Code, but record the error for `cil doctor`.
    logHookError(event, err);
  }
}
