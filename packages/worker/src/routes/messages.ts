import { Hono } from 'hono';
import { Env } from '../lib/db';
import { paginationSchema, updateMessageSchema } from '../lib/validate';

const router = new Hono<{ Bindings: Env }>();

router.get('/', async (c) => {
  const query = c.req.queries();
  const parsed = paginationSchema.safeParse({
    cursor: query.cursor?.[0],
    limit: query.limit?.[0],
  });

  if (!parsed.success) {
    return c.json({ error: 'Invalid pagination query' }, 400);
  }

  const { cursor, limit } = parsed.data;
  const inboxId = c.req.query('inboxId');

  let sql = 'SELECT * FROM messages';
  const binds: any[] = [];

  if (inboxId) {
    sql += ' WHERE inbox_id = ?';
    binds.push(inboxId);
  }

  if (cursor) {
    sql += inboxId ? ' AND created_at < ?' : ' WHERE created_at < ?';
    binds.push(cursor);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  binds.push(limit + 1);

  const result = await c.env.DB.prepare(sql).bind(...binds).all();
  const items = result.results;

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const nextItem = items.pop() as { created_at: string };
    nextCursor = nextItem.created_at;
  }

  return c.json({
    data: items,
    nextCursor,
  });
});

router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const message = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }
  return c.json({ data: message });
});

router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateMessageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid payload', details: parsed.error.format() }, 400);
  }

  const message = await c.env.DB.prepare('SELECT id FROM messages WHERE id = ?').bind(id).first();
  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }

  await c.env.DB.prepare('UPDATE messages SET is_read = ? WHERE id = ?')
    .bind(parsed.data.isRead, id)
    .run();

  const updated = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
  return c.json({ data: updated });
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const message = await c.env.DB.prepare('SELECT id FROM messages WHERE id = ?').bind(id).first();
  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default router;
