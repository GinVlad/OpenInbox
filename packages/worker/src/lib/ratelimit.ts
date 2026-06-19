import { MiddlewareHandler } from 'hono';

// Simple sliding window rate limiter in memory (resets on worker cold starts)
const hits = new Map<string, { count: number; reset: number }>();

export const rateLimiter = (): MiddlewareHandler => {
  return async (c, next) => {
    const limitSetting = c.env.API_RATE_LIMIT_PER_MINUTE;
    if (!limitSetting) {
      return next();
    }

    const limit = parseInt(limitSetting, 10);
    if (isNaN(limit) || limit <= 0) {
      return next();
    }

    const ip = c.req.header('CF-Connecting-IP') || 'local';
    const now = Date.now();
    const client = hits.get(ip);

    if (!client || now > client.reset) {
      hits.set(ip, { count: 1, reset: now + 60000 });
      return next();
    }

    client.count++;
    if (client.count > limit) {
      return c.json({ error: 'Too Many Requests', retryAfter: Math.ceil((client.reset - now) / 1000) }, 429);
    }

    await next();
  };
};
