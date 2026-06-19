import { Hono } from 'hono';
import { Env } from '../lib/db';
import { searchSchema } from '../lib/validate';

const router = new Hono<{ Bindings: Env }>();

router.get('/', async (c) => {
  const query = c.req.queries();
  const parsed = searchSchema.safeParse({
    q: query.q?.[0],
    inboxId: query.inboxId?.[0],
  });

  if (!parsed.success) {
    return c.json({ error: 'Search term "q" is required' }, 400);
  }

  const { q, inboxId } = parsed.data;
  const match = `%${q}%`;

  let sql = `
    SELECT m.* FROM messages m
    WHERE (m.sender LIKE ? OR m.recipient LIKE ? OR m.subject LIKE ?)
  `;
  const binds: unknown[] = [match, match, match];

  if (inboxId) {
    sql += ' AND m.inbox_id = ?';
    binds.push(inboxId);
  }

  sql += ' ORDER BY m.created_at DESC LIMIT 100';

  const result = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ data: result.results });
});

export default router;
