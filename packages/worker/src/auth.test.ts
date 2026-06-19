import { describe, it, expect, vi } from 'vitest';
import app from './router';

function mockEnv(opts: { apiKey?: string; password?: string; secret?: string; openapi?: string } = {}) {
  const db = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ results: [] }),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  return {
    DB: db,
    API_KEY: opts.apiKey ?? '',
    PASSWORD: opts.password ?? '',
    COOKIES_SECRET: opts.secret ?? 'a'.repeat(32),
    ENABLE_OPENAPI: opts.openapi ?? 'false',
  } as any;
}

describe('Bearer Auth', () => {
  it('allows valid Bearer token', async () => {
    const env = mockEnv({ apiKey: 'secret' });
    const req = new Request('http://localhost/api/domains', {
      headers: { Authorization: 'Bearer secret' },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
  });

  it('rejects wrong Bearer token (timing safe)', async () => {
    const env = mockEnv({ apiKey: 'secret' });
    const req = new Request('http://localhost/api/domains', {
      headers: { Authorization: 'Bearer wrong' },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it('rejects missing credentials', async () => {
    const env = mockEnv({ apiKey: 'secret' });
    const req = new Request('http://localhost/api/domains');
    const res = await app.fetch(req, env);
    expect(res.status).toBe(401);
  });
});

describe('Login endpoint', () => {
  it('returns session cookie with correct endpoint format', async () => {
    const env = mockEnv({ password: 'TestPass1', secret: 'x'.repeat(32) });
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'TestPass1' }),
    });
    const res = await app.fetch(req, env);
    const body: any = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toContain('session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
  });

  it('returns 401 on wrong password', async () => {
    const env = mockEnv({ password: 'TestPass1', secret: 'x'.repeat(32) });
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'Wrong' }),
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(401);
  });
});

describe('Cookie-based API access', () => {
  it('allows request with valid session cookie', async () => {
    const env = mockEnv({ password: 'pass', secret: 'y'.repeat(32) });
    // Login to get cookie
    const loginReq = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'pass' }),
    });
    const loginRes = await app.fetch(loginReq, env);
    const setCookie = loginRes.headers.get('Set-Cookie')!;
    expect(setCookie).toBeTruthy();

    // Extract cookie value
    const cookieValue = setCookie.split(';')[0].split('=')[1];

    // Use cookie for subsequent request
    const apiReq = new Request('http://localhost/api/domains', {
      headers: { Cookie: `session=${cookieValue}` },
    });
    const apiRes = await app.fetch(apiReq, env);
    expect(apiRes.status).toBe(200);
  });
});

describe('OpenAPI toggle', () => {
  it('returns 404 when ENABLE_OPENAPI is false', async () => {
    const env = mockEnv({ openapi: 'false' });
    const req = new Request('http://localhost/openapi.json');
    const res = await app.fetch(req, env);
    expect(res.status).toBe(404);
  });

  it('returns spec when ENABLE_OPENAPI is true', async () => {
    const env = mockEnv({ openapi: 'true' });
    const req = new Request('http://localhost/openapi.json');
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.openapi).toBe('3.1.0');
  });

  it('serves Swagger UI HTML', async () => {
    const env = mockEnv({ openapi: 'true' });
    const req = new Request('http://localhost/api-docs');
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('swagger-ui');
  });

  it('serves Redoc HTML', async () => {
    const env = mockEnv({ openapi: 'true' });
    const req = new Request('http://localhost/api-docs/redoc');
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('redoc');
  });
});
