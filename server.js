// Tiny zero-dependency server: serves the game and a shared Top 10 leaderboard.
//   node server.js            -> http://localhost:3000
//   PORT=8080 DATA_DIR=/var/lib/ajd node server.js
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const MAX_SCORES = 10;
const MAX_SCORE = 10_000_000;
const BAD = new Set(['ASS', 'FUK', 'FUC', 'FCK', 'FKU', 'CUM', 'DIC', 'DIK', 'KKK', 'NIG', 'NGR', 'NGA', 'SEX', 'TIT', 'FAG', 'COC', 'COK', 'CNT', 'KNT', 'JIZ', 'WNK', 'WTF', 'GAY', 'HOR', 'SHT', 'SLT', 'VAG', 'PUS', 'NAZ', 'HTL', 'RAP', 'PNS', 'XXX']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

let scores = [];
try {
  const parsed = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  if (Array.isArray(parsed)) scores = parsed;
} catch (e) { /* no scores yet */ }

function sortScores() {
  scores.sort((a, b) => b.score - a.score || a.t - b.t);
  scores = scores.slice(0, MAX_SCORES);
}

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${SCORES_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(scores));
  fs.renameSync(tmp, SCORES_FILE);
}

const publicScores = () => scores.map(({ initials, score }) => ({ initials, score }));

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

const lastPost = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const prev = lastPost.get(ip) || 0;
  lastPost.set(ip, now);
  if (lastPost.size > 5000) lastPost.clear();
  return now - prev < 3000;
}

function handleApi(req, res) {
  if (req.method === 'GET') return json(res, 200, { scores: publicScores() });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1024) { req.destroy(); }
  });
  req.on('end', () => {
    let data;
    try { data = JSON.parse(body); } catch (e) { return json(res, 400, { error: 'Bad request' }); }
    const initials = String(data.initials || '').toUpperCase();
    const score = Number(data.score);
    if (!/^[A-Z]{3}$/.test(initials)) return json(res, 400, { error: 'Initials must be 3 letters.' });
    if (BAD.has(initials)) return json(res, 400, { error: 'Wash yer mooth oot. Try other initials.' });
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return json(res, 400, { error: 'That score looks dodgy.' });
    const ip = req.socket.remoteAddress || '';
    if (rateLimited(ip)) return json(res, 429, { error: 'Haud on, too fast. Try again in a sec.' });

    const entry = { initials, score, t: Date.now() };
    scores.push(entry);
    sortScores();
    const rank = scores.indexOf(entry);
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

const server = http.createServer((req, res) => {
  const p = (req.url || '').split('?')[0];
  if (p === '/api/scores' || p.endsWith('/api/scores')) return handleApi(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res);
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Aberfeldy Jobbie Dash running at http://localhost:${PORT}`));
}

module.exports = server;
