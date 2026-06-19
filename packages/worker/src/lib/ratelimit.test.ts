import { describe, it, expect } from 'vitest';
import { rateLimiter } from '../lib/ratelimit';
import { Hono } from 'hono';

describe('rateLimiter', () => {
  it('allows requests under limit', async () => {
    const app = new Hono();
    app.use('*', rateLimiter());
    app.get('/', (c) => c.text('ok'));

    const env = { API_RATE_LIMIT_PER_MINUTE: '10' } as any;
    const req = new Request('http://localhost/', {
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
  });

  it('returns 429 after exceeding limit', async () => {
    const app = new Hono();
    app.use('*', rateLimiter());
    app.get('/', (c) => c.text('ok'));

    const env = { API_RATE_LIMIT_PER_MINUTE: '2' } as any;
    const ip = '1.2.3.5';

    for (let i = 0; i < 3; i++) {
      const req = new Request('http://localhost/', {
        headers: { 'CF-Connecting-IP': ip },
      });
      const res = await app.fetch(req, env);
      if (i >= 2) {
        expect(res.status).toBe(429);
        const body: any = await res.json();
        expect(body.error).toBe('Too Many Requests');
      }
    }
  });

  it('skips rate limiting when not configured', async () => {
    const app = new Hono();
    app.use('*', rateLimiter());
    app.get('/', (c) => c.text('ok'));

    const env = {} as any;
    const req = new Request('http://localhost/');
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
  });
});
