import { getRecentMemories, storeActivity, storeMemory, getLatestSession } from '../lib/db.js';
import { isVerboseCommand } from '../lib/compress.js';

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

// RTK-inspired: rewrite verbose bash commands to pipe through compression
// Claude Code PreToolUse hook: output JSON to modify the tool call
async function handlePreToolUse(input: HookInput): Promise<void> {
  if (input.tool_name !== 'Bash') return;

  const command = (input.tool_input?.['command'] as string) ?? '';
  if (!command || !isVerboseCommand(command)) return;

  // Skip if already piping through cil compress
  if (command.includes('cil compress')) return;

  // Wrap in subshell so pipes and semicolons inside the command are preserved
  const compressed = `(${command}) 2>&1 | cil compress`;

  // Output modified tool_input — Claude Code uses this instead of the original
  process.stdout.write(JSON.stringify({ tool_input: { command: compressed } }));
}

async function handlePostToolUse(input: HookInput): Promise<void> {
  const sessionId = input.session_id ?? 'unknown';
  const toolName = input.tool_name ?? 'unknown';

  let content = `tool=${toolName}`;

  if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = (input.tool_input?.['file_path'] as string) ?? '';
    content = `edited: ${filePath}`;
    // Auto-store file edits as activity (useful for wrap-up summary)
    storeActivity(sessionId, 'file_edit', filePath);
    return;
  }

  if (toolName === 'Bash') {
    const cmd = (input.tool_input?.['command'] as string) ?? '';
    const summary = cmd.length > 100 ? cmd.slice(0, 100) + '…' : cmd;
    content = `bash: ${summary}`;

    // Auto-capture git commits as decisions
    if (/^git\s+commit/.test(cmd.trim())) {
      const response = JSON.stringify(input.tool_response ?? '');
      storeMemory('decision', `git commit: ${cmd.slice(0, 200)}`, ['git', 'commit'], sessionId);
    }
  }

  storeActivity(sessionId, 'tool_use', content);
}

async function handlePreCompact(input: HookInput): Promise<void> {
  const memories = getRecentMemories(20, 72);
  const session = getLatestSession();

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
    lines.push('', 'Recent context:');
    // Prioritize decisions and constraints over learnings
    const priority = memories.filter((m) => ['decision', 'constraint', 'architecture'].includes(m.category));
    const rest = memories.filter((m) => !['decision', 'constraint', 'architecture'].includes(m.category));
    for (const m of [...priority, ...rest].slice(0, 15)) {
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

export async function hookCommand(event: string): Promise<void> {
  try {
    const raw = await readStdin();
    const input = parseInput(raw);

    switch (event) {
      case 'pre-tool-use':  await handlePreToolUse(input);  break;
      case 'post-tool-use': await handlePostToolUse(input); break;
      case 'pre-compact':   await handlePreCompact(input);  break;
      case 'session-stop':  await handleSessionStop(input); break;
      // Silent fail on unknown events — never block Claude Code
    }
  } catch {
    // Hooks must never crash or block
  }
}
