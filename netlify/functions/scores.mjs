// Shared Top 10 leaderboard on Netlify, stored in Netlify Blobs (no database to set up).
// Served at /api/scores, the same path the self-hosted server.js uses.
// Saving needs a receipt signed by /api/run/finish; the score comes from the receipt,
// and each run can only be saved once. See lib/runs.js.
import { getStore } from '@netlify/blobs';
import leaderboard from '../../lib/leaderboard.js';
import runs from '../../lib/runs.js';
import blobs from '../../lib/update-json.js';

const { validate, insert, publicScores, makeRateLimiter } = leaderboard;
const { open, checkReceipt, sameSite } = runs;
const KEY = 'top10';
const rateLimited = leaderboard.makeWindowLimiter(6, 10000);

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default (req, context) => handleScores(req, context.ip || '', getStore({ name: 'leaderboard', consistency: 'strong' }),
  getStore({ name: 'runs', consistency: 'strong' }), blobs.envVar('RUN_SECRET'));

export async function handleScores(req, ip, store, runStore, secret, now = Date.now()) {

  if (req.method === 'GET') {
    const scores = await store.get(KEY, { type: 'json' });
    return json(200, { scores: publicScores(scores) });
  }
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!secret) return json(503, { error: 'Leaderboard saving is not set up yet.' });
  if (!sameSite(req, new URL(req.url).hostname)) return json(403, { error: 'Not from the game.' });

  let data;
  try {
    const text = await req.text();
    if (text.length > 1024) return json(400, { error: 'Bad request' });
    data = JSON.parse(text);
  } catch (e) {
    return json(400, { error: 'Bad request' });
  }
  const receipt = open(secret, data && data.receipt);
  const rErr = receipt ? checkReceipt(receipt, now) : 'Bad receipt.';
  if (rErr) return json(400, { error: rErr });
  const v = validate({ initials: data.initials, score: receipt.score });
  if (v.error) return json(400, { error: v.error });
  if (rateLimited(ip)) return json(429, { error: 'Haud on, too fast. Try again in a sec.' });
  if (!(await blobs.claimOnce(runStore, `lb-${receipt.id}`, { t: now }))) return json(409, { error: 'That run is already saved.' });

  // Optimistic concurrency: only write if nobody else saved since we read.
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, Math.random() * 40 * attempt));
    const current = await store.getWithMetadata(KEY, { type: 'json' });
    const result = insert(current ? current.data : [], { initials: v.initials, score: v.score, t: Date.now() });
    if (result.rank === -1) return json(200, { scores: publicScores(result.scores), rank: -1 });
    const { modified } = await store.setJSON(KEY, result.scores, current ? { onlyIfMatch: current.etag } : { onlyIfNew: true });
    if (modified) return json(200, { scores: publicScores(result.scores), rank: result.rank });
  }
  return json(429, { error: 'Busy wee leaderboard. Try again in a sec.' });
}

export const config = { path: '/api/scores' };
