-- D1 Database Schema for Personal Disposable Email System

-- Enable foreign keys (may require enabling per-connection in SQLite/D1)
PRAGMA foreign_keys = ON;

-- 1. Domains Table
CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_name ON domains(name);

-- 2. Inboxes Table
CREATE TABLE IF NOT EXISTS inboxes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain_id TEXT NOT NULL,
    full_email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    UNIQUE (domain_id, name)
);

CREATE INDEX IF NOT EXISTS idx_inboxes_domain_id ON inboxes(domain_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inboxes_full_email ON inboxes(full_email);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    inbox_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT DEFAULT '',
    text_body TEXT,
    html_body TEXT,
    headers TEXT, -- JSON-encoded headers
    is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (inbox_id) REFERENCES inboxes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_inbox_id ON messages(inbox_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient);
CREATE INDEX IF NOT EXISTS idx_messages_subject ON messages(subject);

-- 4. Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL, -- in bytes
    r2_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);
