import { describe, it, expect, vi } from 'vitest';
import router from './domains';

function mockEnv() {
  const db = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ results: [{ id: '1', name: 'example.com', enabled: 1, created_at: '2025-01-01' }] }),
    first: vi.fn().mockResolvedValue({ id: 'd1', name: 'example.com', enabled: 1, created_at: '2025-01-01' }),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  return { DB: db } as any;
}

describe('GET /api/domains', () => {
  it('returns domain list', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/');
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/domains', () => {
  it('creates a domain', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'new.com' }),
    });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(201);
  });

  it('rejects invalid payload', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it('returns 409 on duplicate', async () => {
    const env = mockEnv();
    env.DB.run.mockRejectedValue(new Error('UNIQUE constraint failed'));
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'dup.com' }),
    });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/domains/:id', () => {
  it('updates domain enabled', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/d1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: 0 }),
    });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
  });

  it('404 on missing domain', async () => {
    const env = mockEnv();
    env.DB.first.mockResolvedValue(null);
    const req = new Request('http://localhost/bogus', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: 0 }),
    });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/domains/:id', () => {
  it('deletes domain with cascade', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/d1', { method: 'DELETE' });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
  });

  it('404 on missing domain', async () => {
    const env = mockEnv();
    env.DB.first.mockResolvedValue(null);
    const req = new Request('http://localhost/bogus', { method: 'DELETE' });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(404);
  });
});
