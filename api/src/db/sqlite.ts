import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'iem.db');

let db: Database.Database | null = null;

export function initDatabase() {
  console.log('[DB] Initializing database at:', DB_FILE);

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('[DB] Created data directory:', DB_DIR);
  }

  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  addMissingColumns();

  console.log('[DB] Database initialized successfully');
}

function createTables() {
  if (!db) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      department TEXT,
      phone TEXT,
      email TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS emergency_event_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      level TEXT NOT NULL DEFAULT 'medium',
      category TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS emergency_plan_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      eventTypeId TEXT,
      description TEXT,
      content TEXT,
      version TEXT NOT NULL DEFAULT '1.0',
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      FOREIGN KEY (eventTypeId) REFERENCES emergency_event_types(id)
    );

    CREATE TABLE IF NOT EXISTS emergency_solution_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      eventTypeId TEXT,
      planTemplateId TEXT,
      description TEXT,
      content TEXT,
      level TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      FOREIGN KEY (eventTypeId) REFERENCES emergency_event_types(id),
      FOREIGN KEY (planTemplateId) REFERENCES emergency_plan_templates(id)
    );

    CREATE TABLE IF NOT EXISTS emergency_organization (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position TEXT,
      department TEXT,
      phone TEXT,
      email TEXT,
      role TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS emergency_resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      category TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT,
      location TEXT,
      manager TEXT,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'available',
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS emergency_events (
      id TEXT PRIMARY KEY,
      eventTypeId TEXT,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      level TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'detected',
      source TEXT,
      detectedAt TEXT,
      verifiedAt TEXT,
      resolvedAt TEXT,
      data TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      FOREIGN KEY (eventTypeId) REFERENCES emergency_event_types(id)
    );

    CREATE TABLE IF NOT EXISTS emergency_tasks (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assigneeId TEXT,
      assigneeName TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      deadline TEXT,
      solutionData TEXT,
      completedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      FOREIGN KEY (eventId) REFERENCES emergency_events(id)
    );

    CREATE TABLE IF NOT EXISTS emergency_knowledge (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      content TEXT,
      source TEXT,
      eventId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      FOREIGN KEY (eventId) REFERENCES emergency_events(id)
    );

    CREATE TABLE IF NOT EXISTS emergency_solutions (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      eventTypeId TEXT,
      planTemplateId TEXT,
      solutionTemplateId TEXT,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      level TEXT,
      version TEXT DEFAULT '1.0',
      createdBy TEXT,
      approvedBy TEXT,
      publishedAt TEXT,
      archivedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      FOREIGN KEY (eventId) REFERENCES emergency_events(id),
      FOREIGN KEY (eventTypeId) REFERENCES emergency_event_types(id),
      FOREIGN KEY (planTemplateId) REFERENCES emergency_plan_templates(id),
      FOREIGN KEY (solutionTemplateId) REFERENCES emergency_solution_templates(id)
    );

    CREATE TABLE IF NOT EXISTS rag_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      fileName TEXT,
      fileType TEXT,
      fileSize INTEGER,
      fileUrl TEXT,
      category TEXT,
      tags TEXT,
      chunkStrategy TEXT,
      chunkSize INTEGER,
      chunkOverlap INTEGER,
      totalChunks INTEGER,
      charCount INTEGER,
      status TEXT,
      createdBy TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS rag_chunks (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      chunkIndex INTEGER NOT NULL,
      content TEXT NOT NULL,
      tokenCount INTEGER,
      embedding TEXT,
      metadata TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (documentId) REFERENCES rag_documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS event_analysis (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      analysisType TEXT NOT NULL,
      result TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (eventId) REFERENCES emergency_events(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_status ON emergency_events(status);
    CREATE INDEX IF NOT EXISTS idx_events_level ON emergency_events(level);
    CREATE INDEX IF NOT EXISTS idx_events_eventTypeId ON emergency_events(eventTypeId);
    CREATE INDEX IF NOT EXISTS idx_tasks_eventId ON emergency_tasks(eventId);
    
    CREATE TABLE IF NOT EXISTS system_config (
      id TEXT PRIMARY KEY,
      configKey TEXT UNIQUE NOT NULL,
      configValue TEXT,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON emergency_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigneeId ON emergency_tasks(assigneeId);
    CREATE INDEX IF NOT EXISTS idx_knowledge_category ON emergency_knowledge(category);
    CREATE INDEX IF NOT EXISTS idx_solutions_eventId ON emergency_solutions(eventId);
    CREATE INDEX IF NOT EXISTS idx_solutions_status ON emergency_solutions(status);
    CREATE INDEX IF NOT EXISTS idx_solutions_level ON emergency_solutions(level);
    CREATE INDEX IF NOT EXISTS idx_solutions_eventTypeId ON emergency_solutions(eventTypeId);
    CREATE INDEX IF NOT EXISTS idx_rag_chunks_documentId ON rag_chunks(documentId);
    CREATE INDEX IF NOT EXISTS idx_rag_documents_status ON rag_documents(status);
    CREATE INDEX IF NOT EXISTS idx_rag_documents_category ON rag_documents(category);
    CREATE INDEX IF NOT EXISTS idx_analysis_eventId ON event_analysis(eventId);

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      scenario TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'active',
      lastMessageAt TEXT,
      messageCount INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_sessionId ON chat_messages(sessionId);
  `);
}

function addMissingColumns() {
  if (!db) return;

  try {
    db.prepare("SELECT charCount FROM rag_documents LIMIT 1").run();
  } catch {
    try {
      db.exec("ALTER TABLE rag_documents ADD COLUMN charCount INTEGER");
      console.log('[DB] Added charCount column to rag_documents');
    } catch (e) {
      console.warn('[DB] Failed to add charCount column:', e);
    }
  }
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export { db };
