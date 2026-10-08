// Zero-dependency server for local or self-hosted use: serves the game, a shared Top 10 leaderboard
// and play statistics (GET /api/stats?key=$STATS_KEY).
//   node server.js            -> http://localhost:3000
//   PORT=8080 DATA_DIR=/var/lib/ajd node server.js
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { validate, insert, publicScores: toPublic, makeRateLimiter } = require('./lib/leaderboard');
const stats = require('./lib/stats');
const runs = require('./lib/runs');
const crypto = require('crypto');

// Signs run tickets/receipts. Set RUN_SECRET to keep tickets valid across restarts.
const RUN_SECRET = process.env.RUN_SECRET || crypto.randomBytes(24).toString('hex');
const usedRuns = new Set(); // one-time keys: fin-<id>, lb-<id>
const claimOnce = (key) => (usedRuns.has(key) ? false : (usedRuns.add(key), true));
const hostOf = (req) => (req.headers.host || '').split(':')[0];

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

let scores = [];
try {
  const parsed = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  if (Array.isArray(parsed)) scores = parsed;
} catch (e) { /* no scores yet */ }

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${SCORES_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(scores));
  fs.renameSync(tmp, SCORES_FILE);
}

const publicScores = () => toPublic(scores);

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

const rateLimited = require('./lib/leaderboard').makeWindowLimiter(6, 10000);

function readJson(req, res, max, cb) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; if (body.length > max) req.destroy(); });
  req.on('end', () => {
    let data;
    try { data = JSON.parse(body); } catch (e) { return json(res, 400, { error: 'Bad request' }); }
    cb(data);
  });
}

const startLimit = require('./lib/leaderboard').makeWindowLimiter(20, 10000);
function bumpStats(ev) {
  const today = stats.dayKey();
  statData.days[today] = stats.applyEvent(statData.days[today], ev);
  try { persistStats(); } catch (e) { console.error('Failed to save stats', e); }
}

// Run tickets: see lib/runs.js
function handleRun(req, res, p) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!runs.sameSite(req, hostOf(req))) return json(res, 403, { error: 'Not from the game.' });
  if (p.endsWith('/start')) {
    if (startLimit(req.socket.remoteAddress || '')) return json(res, 429, { error: 'Slow down.' });
    bumpStats({ type: 'run' });
    return json(res, 200, { ticket: runs.newTicket(RUN_SECRET) });
  }
  readJson(req, res, 1024, (data) => {
    const now = Date.now();
    const ticket = runs.open(RUN_SECRET, data && data.ticket);
    if (!ticket) return json(res, 400, { error: 'Bad ticket.' });
    const dist = Number(data.dist), score = Number(data.score);
    const err = runs.checkFinish(ticket, now, dist, score);
    if (err) return json(res, 400, { error: err });
    if (!claimOnce(`fin-${ticket.id}`)) return json(res, 409, { error: 'That run was already finished.' });
    bumpStats({ type: 'finish', dist, score });
    json(res, 200, { receipt: runs.newReceipt(RUN_SECRET, ticket, now, dist, score) });
  });
}

function handleApi(req, res) {
  if (req.method === 'GET') return json(res, 200, { scores: publicScores() });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!runs.sameSite(req, hostOf(req))) return json(res, 403, { error: 'Not from the game.' });

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1024) { req.destroy(); }
  });
  req.on('end', () => {
    let data;
    try { data = JSON.parse(body); } catch (e) { return json(res, 400, { error: 'Bad request' }); }
    const receipt = runs.open(RUN_SECRET, data && data.receipt);
    const rErr = receipt ? runs.checkReceipt(receipt, Date.now()) : 'Bad receipt.';
    if (rErr) return json(res, 400, { error: rErr });
    const v = validate({ initials: data.initials, score: receipt.score });
    if (v.error) return json(res, 400, { error: v.error });
    const ip = req.socket.remoteAddress || '';
    if (rateLimited(ip)) return json(res, 429, { error: 'Haud on, too fast. Try again in a sec.' });
    if (!claimOnce(`lb-${receipt.id}`)) return json(res, 409, { error: 'That run is already saved.' });

    const result = insert(scores, { initials: v.initials, score: v.score, t: Date.now() });
    scores = result.scores;
    const rank = result.rank;
    if (rank !== -1) {
      try { persist(); } catch (e) { console.error('Failed to save scores', e); }
    }
    json(res, 200, { scores: publicScores(), rank });
  });
}

function serveStatic(req, res) {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { urlPath = '/'; }
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  });
}

// ---- play statistics: { days: { 'YYYY-MM-DD': counts } }. Nothing identifies a player.
let statData = { days: {} };
try {
  const saved = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  // older versions also kept anonymous player ids; keep only the counts
  for (const [date, rec] of Object.entries(saved.days || {})) statData.days[date] = stats.cleanDay(rec);
} catch (e) { /* none yet */ }
function persistStats() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(`${STATS_FILE}.tmp`, JSON.stringify(statData));
  fs.renameSync(`${STATS_FILE}.tmp`, STATS_FILE);
}
const visitLimit = require('./lib/leaderboard').makeWindowLimiter(10, 10000);
function handleStats(req, res, p) {
  if (p.endsWith('/api/event')) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    if (!runs.sameSite(req, hostOf(req))) return json(res, 403, { error: 'Not from the game.' });
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 512) req.destroy(); });
    req.on('end', () => {
      let ev;
      try { ev = stats.validateEvent(JSON.parse(body)); } catch (e) { return json(res, 400, { error: 'Bad request' }); }
      if (ev.error) return json(res, 400, { error: ev.error });
      if (ev.type !== 'visit') return json(res, 400, { error: 'Runs are counted by the server.' });
      if (visitLimit(req.socket.remoteAddress || '')) return json(res, 200, { ok: false }); // quietly ignored
      bumpStats(ev);
      json(res, 200, { ok: true });
    });
    return;
  }
  const key = process.env.STATS_KEY || '';
  if (!key) return json(res, 503, { error: 'Stats are not set up yet (no STATS_KEY).' });
  if (new URL(req.url, 'http://x').searchParams.get('key') !== key) return json(res, 403, { error: 'Wrong key.' });
  const days = Object.entries(statData.days).map(([date, rec]) => ({ date, rec }));
  json(res, 200, stats.summarize(days));
}

const server = http.createServer((req, res) => {
  const p = (req.url || '').split('?')[0];
  if (p.endsWith('/api/event') || p.endsWith('/api/stats')) return handleStats(req, res, p);
  if (p.endsWith('/api/run/start') || p.endsWith('/api/run/finish')) return handleRun(req, res, p);
  if (p === '/api/scores' || p.endsWith('/api/scores')) return handleApi(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res);
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Aberfeldy Jobbie Dash running at http://localhost:${PORT}`));
}

module.exports = server;
