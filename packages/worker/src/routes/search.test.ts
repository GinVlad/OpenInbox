import { describe, it, expect, vi } from 'vitest';
import router from './search';

const msg = { id: 'm1', inbox_id: 'i1', sender: 'shop@amazon.com', recipient: 't@e.com', subject: 'Order', text_body: 'b', html_body: null, headers: '{}', is_read: 0, created_at: '2025' };

describe('GET /', () => {
  it('returns matching results', async () => {
    const env = {
      DB: {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [msg] }),
      },
    } as any;

    const req = new Request('http://localhost/?q=amazon');
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('rejects missing q', async () => {
    const env = { DB: { prepare: vi.fn() } } as any;
    const req = new Request('http://localhost/');
    const res = await router.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it('filters by inboxId', async () => {
    const env = {
      DB: {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] }),
      },
    } as any;

    const req = new Request('http://localhost/?q=test&inboxId=i1');
    const res = await router.fetch(req, env);
    expect(res.status).toBe(200);
  });
});
