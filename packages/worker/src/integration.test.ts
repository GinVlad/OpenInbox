import { describe, it, expect, vi } from 'vitest';
import app from './router';

function mockEnv() {
  const db = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ results: [] }),
    first: vi.fn().mockResolvedValue({ id: 'd1', name: 'example.com', enabled: 1, created_at: '2025' }),
    run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
  };
  return {
    DB: db,
    API_KEY: 'test-key',
    PASSWORD: 'pass',
    COOKIES_SECRET: 'x'.repeat(32),
    ENABLE_OPENAPI: 'false',
  } as any;
}

const auth = { Authorization: 'Bearer test-key' };

describe('Auth flow', () => {
  it('login returns session cookie', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'pass' }),
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toContain('session=');
  });
});

describe('Domain → inbox → message list', () => {
  it('can list domains', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/api/domains', { headers: auth });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('can list inboxes', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/api/inboxes', { headers: auth });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('can list messages', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/api/messages', { headers: auth });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
  });

  it('can search', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/api/search?q=test', { headers: auth });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
  });
});
