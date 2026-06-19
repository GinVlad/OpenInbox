import { Hono } from 'hono';
import { Env, getAllDomains, createDomain, updateDomainEnabled, deleteDomain, getDomainById } from '../lib/db';
import { createDomainSchema, updateDomainSchema } from '../lib/validate';

const router = new Hono<{ Bindings: Env }>();

router.get('/', async (c) => {
  const result = await getAllDomains(c.env.DB);
  return c.json({ data: result.results });
});

router.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = createDomainSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid domain payload', details: parsed.error.format() }, 400);
  }

  const id = crypto.randomUUID();
  try {
    await createDomain(c.env.DB, id, parsed.data.name.toLowerCase().trim());
    const domain = await getDomainById(c.env.DB, id);
    return c.json({ data: domain }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return c.json({ error: 'Domain already exists' }, 409);
    }
    return c.json({ error: 'Failed to create domain' }, 500);
  }
});

router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateDomainSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid payload', details: parsed.error.format() }, 400);
  }

  const domain = await getDomainById(c.env.DB, id);
  if (!domain) {
    return c.json({ error: 'Domain not found' }, 404);
  }

  await updateDomainEnabled(c.env.DB, id, parsed.data.enabled);
  const updated = await getDomainById(c.env.DB, id);
  return c.json({ data: updated });
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const domain = await getDomainById(c.env.DB, id);
  if (!domain) {
    return c.json({ error: 'Domain not found' }, 404);
  }

  await deleteDomain(c.env.DB, id);
  return c.json({ success: true });
});

export default router;
