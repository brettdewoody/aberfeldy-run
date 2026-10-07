// Zero-dependency server for local or self-hosted use: serves the game and a shared Top 10 leaderboard.
//   node server.js            -> http://localhost:3000
//   PORT=8080 DATA_DIR=/var/lib/ajd node server.js
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { validate, insert, publicScores: toPublic, makeRateLimiter } = require('./lib/leaderboard');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
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

const rateLimited = makeRateLimiter();

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
    const v = validate(data);
    if (v.error) return json(res, 400, { error: v.error });
    const ip = req.socket.remoteAddress || '';
    if (rateLimited(ip)) return json(res, 429, { error: 'Haud on, too fast. Try again in a sec.' });

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
