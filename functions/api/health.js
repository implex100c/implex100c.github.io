import { json } from '../_lib/http.js';

export async function onRequestGet(context) {
  const db = context.env && context.env.DB;
  if (!db || typeof db.prepare !== 'function') {
    return json({ ok: false, error: 'D1 binding is unavailable.' }, 503);
  }

  try {
    await db.prepare('SELECT 1 AS ok').first();
    return json({ ok: true });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Database health check failed.'
      },
      503
    );
  }
}
