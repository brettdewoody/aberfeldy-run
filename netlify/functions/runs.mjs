// Run tickets: RUN! gets a signed ticket; game over trades it for a signed receipt
// if the distance and score are possible in the time that passed. See lib/runs.js.
//   POST /api/run/start                       -> { ticket }
//   POST /api/run/finish {ticket, dist, score} -> { receipt }   (or 400 with a reason)
import { getStore } from '@netlify/blobs';
import runs from '../../lib/runs.js';
import stats from '../../lib/stats.js';
import leaderboard from '../../lib/leaderboard.js';
import blobs from '../../lib/update-json.js';

const { open, newTicket, checkFinish, newReceipt, sameSite } = runs;
const { applyEvent, dayKey } = stats;
const { updateJSON, claimOnce, envVar } = blobs;
const startLimit = leaderboard.makeWindowLimiter(20, 10000); // in memory only; IPs are never stored

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default (req, context) => handleRuns(req, context.ip || '', {
  stats: getStore({ name: 'stats', consistency: 'strong' }),
  runs: getStore({ name: 'runs', consistency: 'strong' }),
}, envVar('RUN_SECRET'));

export async function handleRuns(req, ip, stores, secret, now = Date.now()) {
  if (!secret) return json(503, { error: 'Runs are not set up yet (no RUN_SECRET).' });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const url = new URL(req.url);
  if (!sameSite(req, url.hostname)) return json(403, { error: 'Not from the game.' });

  if (url.pathname.endsWith('/start')) {
    if (startLimit(ip)) return json(429, { error: 'Slow down.' });
    await updateJSON(stores.stats, `day-${dayKey(new Date(now))}`, (rec) => applyEvent(rec, { type: 'run' }));
    return json(200, { ticket: newTicket(secret, now) });
  }

  let data;
  try {
    const text = await req.text();
    if (text.length > 1024) return json(400, { error: 'Bad request' });
    data = JSON.parse(text);
  } catch (e) {
    return json(400, { error: 'Bad request' });
  }
  const ticket = open(secret, data && data.ticket);
  if (!ticket) return json(400, { error: 'Bad ticket.' });
  const dist = Number(data.dist), score = Number(data.score);
  const err = checkFinish(ticket, now, dist, score);
  if (err) return json(400, { error: err });
  if (!(await claimOnce(stores.runs, `fin-${ticket.id}`, { t: now }))) return json(409, { error: 'That run was already finished.' });
  await updateJSON(stores.stats, `day-${dayKey(new Date(now))}`, (rec) => applyEvent(rec, { type: 'finish', dist, score }));
  return json(200, { receipt: newReceipt(secret, ticket, now, dist, score) });
}

export const config = { path: ['/api/run/start', '/api/run/finish'] };
