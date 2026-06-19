import { Hono } from 'hono';
import { Env, getInboxesByDomainId, deleteInbox, getInboxById, getDomainById } from '../lib/db';
import { createInboxSchema } from '../lib/validate';

const router = new Hono<{ Bindings: Env }>();

router.get('/', async (c) => {
  const domainId = c.req.query('domainId');
  const result = await getInboxesByDomainId(c.env.DB, domainId);
  return c.json({ data: result.results });
});

router.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = createInboxSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid inbox payload', details: parsed.error.format() }, 400);
  }

  const { name, domainId } = parsed.data;
  const domain = (await getDomainById(c.env.DB, domainId)) as { id: string; name: string; enabled: number } | null;
  if (!domain) {
    return c.json({ error: 'Domain not found' }, 404);
  }
  if (domain.enabled === 0) {
    return c.json({ error: 'Domain is disabled' }, 400);
  }

  const cleanName = name.toLowerCase().trim();
  const fullEmail = `${cleanName}@${domain.name}`;
  const id = crypto.randomUUID();

  try {
    await c.env.DB.prepare(
      'INSERT INTO inboxes (id, name, domain_id, full_email, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))'
    ).bind(id, cleanName, domainId, fullEmail).run();

    const inbox = await getInboxById(c.env.DB, id);
    return c.json({ data: inbox }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return c.json({ error: 'Inbox already exists' }, 409);
    }
    return c.json({ error: 'Failed to create inbox' }, 500);
  }
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const inbox = await getInboxById(c.env.DB, id);
  if (!inbox) {
    return c.json({ error: 'Inbox not found' }, 404);
  }

  await deleteInbox(c.env.DB, id);
  return c.json({ success: true });
});

export default router;
