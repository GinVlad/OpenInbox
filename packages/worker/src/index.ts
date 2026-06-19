import { Env } from './lib/db';
import app from './router';
import { handleEmail } from './email';

export default {
  fetch: app.fetch,

  async email(message: any, env: Env): Promise<void> {
    await handleEmail(message, env);
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    const result = await env.DB.prepare(
      `DELETE FROM messages WHERE created_at < datetime('now', '-24 hours')`
    ).run();
    console.log(`Deleted ${result.meta.changes} expired messages`);
  },
};
