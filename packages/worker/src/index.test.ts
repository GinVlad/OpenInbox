import { describe, it, expect, vi } from 'vitest';

const createMockDB = () => ({
  prepare: vi.fn(),
});

describe('API Auth (Bearer + Cookie)', () => {
  it('returns 401 when no auth at all', async () => {
    const { default: app } = await import('./router');
    const req = new Request('http://localhost/api/domains');
    const res = await app.fetch(req, { API_KEY: 'my-key', PASSWORD: 'pass', COOKIES_SECRET: 'sec' });
    expect(res.status).toBe(401);
  });

  it('allows valid Bearer API_KEY', async () => {
    const db = createMockDB();
    db.prepare.mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
    });
    const { default: app } = await import('./router');
    const req = new Request('http://localhost/api/domains', {
      headers: { Authorization: 'Bearer my-key' },
    });
    const res = await app.fetch(req, { DB: db, API_KEY: 'my-key', PASSWORD: 'pass', COOKIES_SECRET: 'sec' });
    expect(res.status).toBe(200);
  });

  it('rejects wrong Bearer token', async () => {
    const { default: app } = await import('./router');
    const req = new Request('http://localhost/api/domains', {
      headers: { Authorization: 'Bearer bad-key' },
    });
    const res = await app.fetch(req, { API_KEY: 'my-key', PASSWORD: 'pass', COOKIES_SECRET: 'sec' });
    expect(res.status).toBe(401);
  });
});

describe('Scheduled cleanup', () => {
  it('deletes messages older than 24h', async () => {
    const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 3 } });
    const mockDB = { prepare: vi.fn(() => ({ run: mockRun })) };

    const { default: worker } = await import('./index');
    await worker.scheduled({}, { DB: mockDB } as any);
    expect(mockDB.prepare).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM messages WHERE created_at < datetime('now', '-24 hours')")
    );
    expect(mockRun).toHaveBeenCalled();
  });
});
