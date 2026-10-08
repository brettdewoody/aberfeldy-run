// Run tickets and anti-cheat checks, shared by server.js and the Netlify functions.
//
// 1. RUN! asks the server for a ticket: {id, t0} signed with a secret only the server knows.
// 2. Game over sends the ticket + distance + score. The server checks the claim is possible
//    in the real time since t0 (the game's top speed, plus bike boosts), then returns a
//    signed receipt {id, t0, t1, dist, score}.
// 3. Only a receipt can be saved to the leaderboard, and each run only once.
// This stops faked requests, edited scores and replays. It can't stop someone who writes a
// bot to actually play the game; nothing running in a browser can.
'use strict';

const crypto = require('crypto');

const MAX_RUN_SECONDS = 45 * 60; // a ticket older than this can't be finished
const RECEIPT_MAX_AGE = 30 * 60; // a receipt must be saved within 30 min of finishing

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const sign = (secret, s) => crypto.createHmac('sha256', secret).update(s).digest('base64url');

function seal(secret, obj) {
  const body = b64(obj);
  return `${body}.${sign(secret, body)}`;
}

// Returns the payload if the signature is valid, else null.
function open(secret, token) {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = Buffer.from(sign(secret, body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()); } catch (e) { return null; }
}

const newTicket = (secret, now = Date.now()) => seal(secret, { id: crypto.randomBytes(9).toString('base64url'), t0: now });

// The furthest a real run could get in `seconds`: the game's speed curve
// min(30, 10 + 0.21 t) integrated, plus a bike boost (x1.7 for 5 s) at most every 25 s,
// with 15% slack for timing differences.
function maxDistance(seconds) {
  const tCap = (30 - 10) / 0.21;
  const base = seconds <= tCap
    ? 10 * seconds + 0.105 * seconds * seconds
    : 10 * tCap + 0.105 * tCap * tCap + 30 * (seconds - tCap);
  const bikes = Math.floor(seconds / 25) + 1;
  return (base + bikes * 5 * 30 * 0.7) * 1.15 + 20;
}

// Checks a finish claim against its ticket. Returns an error message, or null if it's fine.
function checkFinish(ticket, now, dist, score) {
  if (!Number.isInteger(dist) || !Number.isInteger(score) || dist < 0 || score < 0) return 'Bad run data.';
  const seconds = (now - ticket.t0) / 1000;
  if (seconds < 0 || seconds > MAX_RUN_SECONDS) return 'That run has expired.';
  if (dist > maxDistance(seconds)) return 'That run was impossibly fast.';
  // score = whole metres + bonuses; bonuses can't be negative and are bounded per metre
  if (score < dist) return "That score doesn't add up.";
  if (score > dist * 8 + 400) return "That score doesn't add up.";
  return null;
}

const newReceipt = (secret, ticket, now, dist, score) => seal(secret, { id: ticket.id, t0: ticket.t0, t1: now, dist, score });

function checkReceipt(r, now) {
  if (!r || typeof r.id !== 'string' || !Number.isInteger(r.score) || !Number.isInteger(r.t1)) return 'Bad receipt.';
  if ((now - r.t1) / 1000 > RECEIPT_MAX_AGE) return 'Too late to save that run.';
  return null;
}

// Refuses requests that clearly come from another website. Some browsers (notably on
// iPhones and in-app browsers) leave Origin off a page's own requests, so a missing header
// is allowed: the signed tickets and time checks are the real protection.
function sameSite(req, host) {
  const get = (k) => (req.headers.get ? req.headers.get(k) : req.headers[k]) || '';
  const from = get('origin') || get('referer');
  if (!from || from === 'null') return true;
  let h;
  try { h = new URL(from).hostname; } catch (e) { return false; }
  const ours = new Set([host, 'localhost', '127.0.0.1',
    get('host').split(':')[0], get('x-forwarded-host').split(',')[0].trim().split(':')[0]].filter(Boolean));
  return ours.has(h);
}

module.exports = { open, newTicket, checkFinish, newReceipt, checkReceipt, maxDistance, sameSite };
