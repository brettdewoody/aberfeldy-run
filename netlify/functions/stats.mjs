// Play statistics on Netlify, stored in Netlify Blobs.
//   POST /api/event  {type: 'visit', first?}   (sent by the game; runs/finishes are counted
//                                               server-side by /api/run, so they can't be faked)
//   GET  /api/stats?key=STATS_KEY                                         (the private stats page)
// Only daily counts are stored; nothing identifies a player.
import { getStore } from '@netlify/blobs';
import stats from '../../lib/stats.js';
import runs from '../../lib/runs.js';
import leaderboard from '../../lib/leaderboard.js';
import blobs from '../../lib/update-json.js';

const { validateEvent, applyEvent, summarize, dayKey, cleanDay, needsCleaning } = stats;
const { updateJSON } = blobs;
const visitLimit = leaderboard.makeRateLimiter(5000); // in memory only; IPs are never stored

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default (req, context) => handleStats(req, getStore({ name: 'stats', consistency: 'strong' }), blobs.envVar('STATS_KEY'), context.ip || '');

export async function handleStats(req, store, key, ip = '') {
  const url = new URL(req.url);

  if (url.pathname.endsWith('/api/event')) {
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!runs.sameSite(req, url.hostname)) return json(403, { error: 'Not from the game.' });
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
    if (ev.type !== 'visit') return json(400, { error: 'Runs are counted by the server.' });
    if (visitLimit(ip)) return json(200, { ok: false }); // quietly ignored, not counted
    const today = dayKey();
    const ok = await updateJSON(store, `day-${today}`, (rec) => applyEvent(rec, ev));
    return json(ok ? 200 : 429, { ok });
  }

  // GET /api/stats
  if (!key) return json(503, { error: 'Stats are not set up yet (no STATS_KEY).' });
  if (url.searchParams.get('key') !== key) return json(403, { error: 'Wrong key.' });
  const { blobs } = await store.list({ prefix: 'day-' });
  const days = await Promise.all(blobs.map(async (b) => ({ date: b.key.slice(4), rec: await store.get(b.key, { type: 'json' }) })));
  // One-off tidy-up: an earlier version stored anonymous player ids. Remove them for good.
  await store.delete('players');
  await Promise.all(days.filter((d) => needsCleaning(d.rec)).map((d) => updateJSON(store, `day-${d.date}`, (rec) => (needsCleaning(rec) ? cleanDay(rec) : null))));
  return json(200, summarize(days));
}

export const config = { path: ['/api/event', '/api/stats'] };
