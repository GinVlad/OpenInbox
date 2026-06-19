import { describe, it, expect, vi } from 'vitest';
import router from './messages';

const msg = { id: 'm1', inbox_id: 'i1', sender: 'a@b.com', recipient: 't@e.com', subject: 'Hi', text_body: 'b', html_body: null, headers: '{}', is_read: 0, created_at: '2025-01-01T00:00:00Z' };

function mockEnv(results = [msg]) {
  return {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results }),
      first: vi.fn().mockResolvedValue(results[0]),
      run: vi.fn().mockResolvedValue({ success: true }),
    },
  } as any;
}

describe('GET /', () => {
  it('lists messages', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/?inboxId=i1');
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
  });
});

describe('GET /:id', () => {
  it('returns message', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/m1');
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.id).toBe('m1');
  });
});

describe('PATCH /:id', () => {
  it('marks read', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/m1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: 1 }),
    });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
  });
});

describe('DELETE /:id', () => {
  it('deletes message', async () => {
    const env = mockEnv();
    const req = new Request('http://localhost/m1', { method: 'DELETE' });
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
  });
});
