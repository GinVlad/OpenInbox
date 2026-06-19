import { describe, it, expect, vi } from 'vitest';
import router from './inboxes';

function mockEnv() {
  return {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [{ id: 'i1', name: 'test', domain_id: 'd1', full_email: 'test@e.com', created_at: '2025' }] }),
      first: vi.fn().mockResolvedValue({ id: 'd1', name: 'example.com', enabled: 1 }),
      run: vi.fn().mockResolvedValue({ success: true }),
    },
  } as any;
}

describe('GET /', () => {
  it('returns inbox list', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/');
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /', () => {
  it('creates inbox', async () => {
    const env = mockEnv();
    env.DB.first.mockResolvedValueOnce({ id: 'd1', name: 'example.com', enabled: 1 });
    env.DB.run.mockResolvedValue({ success: true });
    env.DB.first.mockResolvedValueOnce({ id: 'i1', name: 'test', domain_id: 'd1', full_email: 'test@example.com', created_at: '2025' });

    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test', domainId: 'd1' }),
    });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(201);
  });

  it('rejects name too short', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ab', domainId: 'd1' }),
    });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it('rejects uppercase name', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'BAD', domainId: 'd1' }),
    });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it('404 if domain missing', async () => {
    const env = mockEnv();
    env.DB.first.mockResolvedValue(null);
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test', domainId: 'bogus' }),
    });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /:id', () => {
  it('deletes inbox', async () => {
    const env = mockEnv();
    env.DB.first.mockResolvedValue({ id: 'i1' });
    const req = new Request('http://localhost/i1', { method: 'DELETE' });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
  });

  it('404 if missing', async () => {
    const env = mockEnv();
    env.DB.first.mockResolvedValue(null);
    const req = new Request('http://localhost/bogus', { method: 'DELETE' });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(404);
  });
});
