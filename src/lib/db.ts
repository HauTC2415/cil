import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DB_PATH } from './paths.js';

export type MemoryCategory = 'decision' | 'constraint' | 'learning' | 'task' | 'architecture' | 'summary';

export interface MemoryEntry {
  category: string;
  content: string;
  tags: string;
  session_id: string;
  created_at: number;
}

export interface SessionSnapshot {
  id: string;
  snapshot: string;
  created_at: number;
}

let _db: Database.Database | null = null;

export function getDb(dbPath = DB_PATH): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memory USING fts5(
      category,
      content,
      tags,
      session_id,
      created_at UNINDEXED,
      tokenize = 'porter ascii'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      snapshot TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  return _db;
}

export function storeMemory(
  category: string,
  content: string,
  tags: string[],
  sessionId = 'manual',
  dbPath?: string,
): void {
  const db = getDb(dbPath);
  db.prepare(`
    INSERT INTO memory (category, content, tags, session_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(category, content, tags.join(' '), sessionId, Date.now());
}

export function searchMemory(
  query: string,
  limit = 10,
  category?: string,
  dbPath?: string,
): MemoryEntry[] {
  const db = getDb(dbPath);

  if (category) {
    return db.prepare(`
      SELECT category, content, tags, session_id, created_at
      FROM memory
      WHERE memory MATCH ? AND category = ?
      ORDER BY rank
      LIMIT ?
    `).all(query, category, limit) as MemoryEntry[];
  }

  return db.prepare(`
    SELECT category, content, tags, session_id, created_at
    FROM memory
    WHERE memory MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(query, limit) as MemoryEntry[];
}

export function getRecentMemories(limit = 30, hoursBack = 24, dbPath?: string): MemoryEntry[] {
  const db = getDb(dbPath);
  const since = Date.now() - hoursBack * 3_600_000;

  return db.prepare(`
    SELECT category, content, tags, session_id, created_at
    FROM memory
    WHERE created_at > ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(since, limit) as MemoryEntry[];
}

export function storeSession(id: string, snapshot: string, dbPath?: string): void {
  const db = getDb(dbPath);
  db.prepare(`
    INSERT OR REPLACE INTO sessions (id, snapshot, created_at)
    VALUES (?, ?, ?)
  `).run(id, snapshot, Date.now());
}

export function getLatestSession(dbPath?: string): SessionSnapshot | null {
  const db = getDb(dbPath);
  return db.prepare(`
    SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1
  `).get() as SessionSnapshot | null;
}

export function storeActivity(
  sessionId: string,
  eventType: string,
  content: string,
  dbPath?: string,
): void {
  const db = getDb(dbPath);
  db.prepare(`
    INSERT INTO activity (session_id, event_type, content, created_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, eventType, content, Date.now());
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}
