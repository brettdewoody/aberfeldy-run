// Shared Top 10 leaderboard on Netlify, stored in Netlify Blobs (no database to set up).
// Served at /api/scores, the same path the self-hosted server.js uses.
import { getStore } from '@netlify/blobs';
import leaderboard from '../../lib/leaderboard.js';

const { validate, insert, publicScores, makeRateLimiter } = leaderboard;
const KEY = 'top10';
const rateLimited = makeRateLimiter();

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default (req, context) => handleScores(req, context.ip || '', getStore({ name: 'leaderboard', consistency: 'strong' }));

export async function handleScores(req, ip, store) {

  if (req.method === 'GET') {
    const scores = await store.get(KEY, { type: 'json' });
    return json(200, { scores: publicScores(scores) });
  }
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let data;
  try {
    const text = await req.text();
    if (text.length > 1024) return json(400, { error: 'Bad request' });
    data = JSON.parse(text);
  } catch (e) {
    return json(400, { error: 'Bad request' });
  }
  const v = validate(data);
  if (v.error) return json(400, { error: v.error });
  if (rateLimited(ip)) return json(429, { error: 'Haud on, too fast. Try again in a sec.' });

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
