export interface Env {
  DB: D1Database;
  EMAIL_DOMAIN?: string;
  PASSWORD?: string;
  COOKIES_SECRET?: string;
  API_KEY?: string;
  TURNSTILE_KEY?: string;
  TURNSTILE_SECRET?: string;
  API_RATE_LIMIT_PER_MINUTE?: string;
  SHOW_ADS?: string;
  ENABLE_OPENAPI?: string;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export async function getDomainById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM domains WHERE id = ?').bind(id).first();
}

export async function getInboxById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM inboxes WHERE id = ?').bind(id).first();
}

export async function getAllDomains(db: D1Database) {
  return db.prepare('SELECT * FROM domains ORDER BY name ASC').all();
}

export async function getInboxesByDomainId(db: D1Database, domainId?: string) {
  if (domainId) {
    return db.prepare('SELECT * FROM inboxes WHERE domain_id = ? ORDER BY created_at DESC').bind(domainId).all();
  }
  return db.prepare('SELECT * FROM inboxes ORDER BY created_at DESC').all();
}

export async function createDomain(db: D1Database, id: string, name: string) {
  return db.prepare(
    'INSERT INTO domains (id, name, enabled, created_at) VALUES (?, ?, 1, datetime(\'now\'))'
  ).bind(id, name).run();
}

export async function updateDomainEnabled(db: D1Database, id: string, enabled: number) {
  return db.prepare('UPDATE domains SET enabled = ? WHERE id = ?').bind(enabled, id).run();
}

export async function deleteDomain(db: D1Database, id: string) {
  await db.prepare(
    `DELETE FROM messages WHERE inbox_id IN (SELECT id FROM inboxes WHERE domain_id = ?)`
  ).bind(id).run();
  await db.prepare('DELETE FROM inboxes WHERE domain_id = ?').bind(id).run();
  return db.prepare('DELETE FROM domains WHERE id = ?').bind(id).run();
}

export async function deleteInbox(db: D1Database, id: string) {
  await db.prepare('DELETE FROM messages WHERE inbox_id = ?').bind(id).run();
  return db.prepare('DELETE FROM inboxes WHERE id = ?').bind(id).run();
}
