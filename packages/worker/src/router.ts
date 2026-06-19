import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './lib/db';
import { rateLimiter } from './lib/ratelimit';
import domainsRouter from './routes/domains';
import inboxesRouter from './routes/inboxes';
import messagesRouter from './routes/messages';
import searchRouter from './routes/search';

// Timing-safe byte comparison for secrets
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const maxLength = Math.max(a.length, b.length);
  for (let i = 0; i < maxLength; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

async function signSessionCookie(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payload}.${sigB64}`;
}

async function verifySessionCookie(cookieValue: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;
  const payload = parts[0];
  const sig = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(payload));
  if (!valid) return null;

  try {
    const parsed = JSON.parse(atob(payload));
    if (parsed.exp && Date.now() > (parsed.exp as number) * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}));

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' https://unpkg.com https://cdn.redoc.ly; style-src 'self' 'unsafe-inline' https://unpkg.com; frame-src 'self'; img-src 'self' data:; connect-src 'self'");
});

// Rate limiter (early, before auth)
app.use('/api/*', rateLimiter());

// Authentication middleware (both Bearer API_KEY + Password Cookie)
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS' || c.req.path === '/api/auth/login' || c.req.path === '/api/auth/logout') {
    return next();
  }

  // Auth method 1: Bearer API_KEY token
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const apiKey = c.env.API_KEY;
    if (apiKey && safeEqual(token, apiKey)) {
      return next();
    }
    if (apiKey && !safeEqual(token, apiKey)) {
      return c.json({ error: 'Unauthorized: Invalid API Key' }, 401);
    }
  }

  // Auth method 2: Password-signed cookie (UI admin login)
  const cookies = c.req.header('Cookie') || '';
  const sessionCookie = cookies.split(';').find((c) => c.trim().startsWith('session='));
  if (sessionCookie && c.env.COOKIES_SECRET) {
    const value = sessionCookie.split('=').slice(1).join('=').trim();
    const session = await verifySessionCookie(value, c.env.COOKIES_SECRET);
    if (session?.session === true) {
      return next();
    }
    if (!session) {
      return c.json({ error: 'Unauthorized: Invalid session' }, 401);
    }
  }

  if (!authHeader && !sessionCookie) {
    return c.json({ error: 'Unauthorized: Missing credentials' }, 401);
  }

  return c.json({ error: 'Unauthorized' }, 401);
});

// OpenAPI routes (no auth, controlled by ENABLE_OPENAPI env var)
app.get('/openapi.json', async (c) => {
  if (c.env.ENABLE_OPENAPI !== 'true') {
    return c.json({ error: 'Not Found' }, 404);
  }
  const { openApiSpec } = await import('./openapi/spec');
  return c.json(openApiSpec);
});

app.get('/openapi.yaml', async (c) => {
  if (c.env.ENABLE_OPENAPI !== 'true') {
    return c.json({ error: 'Not Found' }, 404);
  }
  const { openApiSpec } = await import('./openapi/spec');
  return c.text(JSON.stringify(openApiSpec, null, 2), 200, { 'Content-Type': 'application/yaml' });
});

app.get('/api-docs', async (c) => {
  if (c.env.ENABLE_OPENAPI !== 'true') {
    return c.text('Not Found', 404);
  }
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenInbox API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
      });
    };
  </script>
</body>
</html>`);
});

app.get('/api-docs/redoc', async (c) => {
  if (c.env.ENABLE_OPENAPI !== 'true') {
    return c.text('Not Found', 404);
  }
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenInbox API — Redoc</title>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init('/openapi.json', {}, document.getElementById('redoc-container'));
  </script>
</body>
</html>`);
});

// Mount API routes
app.route('/api/domains', domainsRouter);
app.route('/api/inboxes', inboxesRouter);
app.route('/api/messages', messagesRouter);
app.route('/api/search', searchRouter);

// Login endpoint (no auth required)
app.post('/api/auth/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { password } = body;

  if (!password || !c.env.PASSWORD || !c.env.COOKIES_SECRET || c.env.COOKIES_SECRET.length < 32) {
    console.warn(`Login rejected: server misconfigured (COOKIES_SECRET missing or < 32 chars)`);
    return c.json({ error: 'Invalid request: server not configured' }, 400);
  }

  if (!safeEqual(password, c.env.PASSWORD)) {
    console.log(`Failed login attempt`);
    return c.json({ error: 'Invalid password' }, 401);
  }

  // Create signed session cookie: payload = { session: true, exp }
  const exp = Math.floor(Date.now() / 1000) + 86400; // 24h
  const payload = btoa(JSON.stringify({ session: true, exp }));
  const cookieValue = await signSessionCookie(payload, c.env.COOKIES_SECRET);

  c.header('Set-Cookie', `session=${cookieValue}; HttpOnly; Secure; Path=/; Max-Age=86400; SameSite=Lax`);
  return c.json({ success: true });
});

// Logout endpoint
app.post('/api/auth/logout', async (c) => {
  c.header('Set-Cookie', 'session=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax');
  return c.json({ success: true });
});

// Serve static frontend assets (after API routes)
app.get('/*', async (c, next) => {
  // @ts-ignore
  const assets: any = c.env.ASSETS;
  if (!assets) {
    await next();
    return;
  }

  try {
    const url = new URL(c.req.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const res = await assets.fetch(new Request(url.origin + path));
    if (res.ok) return res;
  } catch {
    // Asset not found, fall through
  }

  // SPA fallback: serve index.html for any non-asset route
  try {
    const res = await assets.fetch(new Request(new URL(c.req.url).origin + '/index.html'));
    if (res.ok) return res;
  } catch {}

  await next();
});

// Health
app.get('/', (c) => {
  return c.text('OpenInbox API is active.');
});

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

export default app;
