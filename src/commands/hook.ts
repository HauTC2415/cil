import { getRecentMemories, storeActivity, getLatestSession } from '../lib/db.js';

interface HookInput {
  session_id?: string;
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
    // If stdin has no data within 100ms, resolve with empty string
    setTimeout(() => resolve(data), 100);
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

async function handlePostToolUse(input: HookInput): Promise<void> {
  const sessionId = input.session_id ?? 'unknown';
  const toolName = input.tool_name ?? 'unknown';

  let content = `tool=${toolName}`;

  if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = (input.tool_input?.['file_path'] as string) ?? '';
    content = `edited file: ${filePath}`;
  } else if (toolName === 'Bash') {
    const cmd = (input.tool_input?.['command'] as string) ?? '';
    const summary = cmd.length > 120 ? cmd.slice(0, 120) + '…' : cmd;
    content = `bash: ${summary}`;
  }

  storeActivity(sessionId, 'tool_use', content);
}

async function handlePreCompact(input: HookInput): Promise<void> {
  // Output a compact memory summary — Claude Code prepends this to the compacted context
  const memories = getRecentMemories(20, 72);
  const session = getLatestSession();

  const lines: string[] = ['[CIL Memory Snapshot]'];

  if (session) {
    lines.push('', 'Last session:', session.snapshot);
  }

  if (memories.length > 0) {
    lines.push('', 'Recent memories:');
    for (const m of memories) {
      lines.push(`- [${m.category}] ${m.content}`);
    }
  }

  const output = lines.join('\n');

  // Stay under 2KB
  if (output.length > 1800) {
    const trimmed = output.slice(0, 1800) + '\n… (truncated)';
    process.stdout.write(trimmed);
  } else {
    process.stdout.write(output);
  }
}

async function handleSessionStop(input: HookInput): Promise<void> {
  const sessionId = input.session_id ?? 'unknown';
  storeActivity(sessionId, 'session_stop', 'session ended');
}

export async function hookCommand(event: string): Promise<void> {
  const raw = await readStdin();
  const input = parseInput(raw);

  switch (event) {
    case 'post-tool-use':
      await handlePostToolUse(input);
      break;
    case 'pre-compact':
      await handlePreCompact(input);
      break;
    case 'session-stop':
      await handleSessionStop(input);
      break;
    default:
      // Unknown event — silent fail (never block Claude Code)
      break;
  }
}
