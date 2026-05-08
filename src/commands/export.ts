import fs from 'fs';
import chalk from 'chalk';
import { getDb } from '../lib/db.js';

interface ExportPayload {
  version: 1;
  exported_at: string;
  memory: Array<{
    category: string;
    content: string;
    tags: string;
    session_id: string;
    created_at: number;
  }>;
  sessions: Array<{ id: string; snapshot: string; created_at: number }>;
}

export async function exportCommand(options: { out?: string }): Promise<void> {
  const db = getDb();

  const memory = db
    .prepare('SELECT category, content, tags, session_id, created_at FROM memory')
    .all() as ExportPayload['memory'];

  const sessions = db
    .prepare('SELECT id, snapshot, created_at FROM sessions')
    .all() as ExportPayload['sessions'];

  const payload: ExportPayload = {
    version: 1,
    exported_at: new Date().toISOString(),
    memory,
    sessions,
  };

  const json = JSON.stringify(payload, null, 2);

  if (options.out) {
    fs.writeFileSync(options.out, json);
    console.log(
      chalk.green(`✓ Exported ${memory.length} memories, ${sessions.length} sessions → ${options.out}`),
    );
  } else {
    process.stdout.write(json);
  }
}
