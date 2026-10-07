// Play statistics on Netlify, stored in Netlify Blobs.
//   POST /api/event  {type: 'visit'|'run'|'finish', pid, dist?, score?}   (sent by the game)
//   GET  /api/stats?key=STATS_KEY                                         (the private stats page)
import { getStore } from '@netlify/blobs';
import stats from '../../lib/stats.js';

const { validateEvent, applyEvent, summarize, dayKey } = stats;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

// Read-modify-write with an ETag check, retried if someone else wrote in between.
async function updateJSON(store, key, fn) {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, Math.random() * 40 * attempt));
    const cur = await store.getWithMetadata(key, { type: 'json' });
    const next = fn(cur ? cur.data : null);
    if (next === null) return true; // nothing to change
    const { modified } = await store.setJSON(key, next, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (modified) return true;
  }
  return false;
}

export default (req) => handleStats(req, getStore({ name: 'stats', consistency: 'strong' }), statsKey());

function statsKey() {
  try { if (typeof Netlify !== 'undefined' && Netlify.env) return Netlify.env.get('STATS_KEY') || ''; } catch (e) { /* not on Netlify */ }
  return process.env.STATS_KEY || '';
}

export async function handleStats(req, store, key) {
  const url = new URL(req.url);

  if (url.pathname.endsWith('/api/event')) {
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
    let data;
    try {
      const text = await req.text();
      if (text.length > 512) return json(400, { error: 'Bad request' });
      data = JSON.parse(text);
    } catch (e) {
      return json(400, { error: 'Bad request' });
    }
    const ev = validateEvent(data);
    if (ev.error) return json(400, { error: ev.error });
    const today = dayKey();
    const ok = await updateJSON(store, `day-${today}`, (rec) => applyEvent(rec, ev));
    if (ev.type === 'visit') {
      // all-time player list: id -> first day seen
      await updateJSON(store, 'players', (all) => (all && all[ev.pid] ? null : Object.assign({}, all, { [ev.pid]: today })));
    }
    return json(ok ? 200 : 429, { ok });
  }

  // GET /api/stats
  if (!key) return json(503, { error: 'Stats are not set up yet (no STATS_KEY).' });
  if (url.searchParams.get('key') !== key) return json(403, { error: 'Wrong key.' });
  const { blobs } = await store.list({ prefix: 'day-' });
  const days = await Promise.all(blobs.map(async (b) => ({ date: b.key.slice(4), rec: await store.get(b.key, { type: 'json' }) })));
  const players = (await store.get('players', { type: 'json' })) || {};
  return json(200, summarize(days, Object.keys(players).length));
}

export const config = { path: ['/api/event', '/api/stats'] };
