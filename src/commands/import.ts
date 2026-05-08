import fs from 'fs';
import { createHash } from 'crypto';
import chalk from 'chalk';
import { getDb } from '../lib/db.js';

interface ExportPayload {
  version: number;
  memory?: Array<{
    category: string;
    content: string;
    tags: string;
    session_id: string;
    created_at: number;
  }>;
  sessions?: Array<{ id: string; snapshot: string; created_at: number }>;
}

// Stable fingerprint for dedup. Same category+content+tags = same memory.
function memoryHash(category: string, content: string, tags: string): string {
  return createHash('sha256').update(`${category}\0${content}\0${tags}`).digest('hex');
}

export async function importCommand(file: string): Promise<void> {
  if (!fs.existsSync(file)) {
    console.error(chalk.red(`File not found: ${file}`));
    process.exit(1);
  }

  let payload: ExportPayload;
  try {
    payload = JSON.parse(fs.readFileSync(file, 'utf-8')) as ExportPayload;
  } catch (err) {
    console.error(chalk.red(`Invalid JSON: ${String(err)}`));
    process.exit(1);
  }

  if (payload.version !== 1) {
    console.error(chalk.red(`Unsupported export version: ${payload.version}`));
    process.exit(1);
  }

  const db = getDb();

  // Build a set of existing memory fingerprints to dedup against.
  const existing = new Set<string>();
  const rows = db.prepare('SELECT category, content, tags FROM memory').all() as Array<{
    category: string;
    content: string;
    tags: string;
  }>;
  for (const r of rows) existing.add(memoryHash(r.category, r.content, r.tags));

  const insertMem = db.prepare(
    'INSERT INTO memory (category, content, tags, session_id, created_at) VALUES (?, ?, ?, ?, ?)',
  );

  let importedMem = 0;
  let skippedMem = 0;
  const memTx = db.transaction((items: NonNullable<ExportPayload['memory']>) => {
    for (const m of items) {
      const h = memoryHash(m.category, m.content, m.tags);
      if (existing.has(h)) {
        skippedMem++;
        continue;
      }
      insertMem.run(m.category, m.content, m.tags, m.session_id, m.created_at);
      existing.add(h);
      importedMem++;
    }
  });
  memTx(payload.memory ?? []);

  const insertSession = db.prepare(
    'INSERT OR IGNORE INTO sessions (id, snapshot, created_at) VALUES (?, ?, ?)',
  );

  let importedSes = 0;
  for (const s of payload.sessions ?? []) {
    const result = insertSession.run(s.id, s.snapshot, s.created_at);
    if (result.changes > 0) importedSes++;
  }

  console.log(chalk.green(`✓ Imported ${importedMem} memories (skipped ${skippedMem} duplicates)`));
  console.log(chalk.green(`✓ Imported ${importedSes} sessions (skipped ${(payload.sessions?.length ?? 0) - importedSes} existing)`));
}
