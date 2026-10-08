// Leaderboard rules shared by server.js (self-hosted) and the Netlify function.
'use strict';

const MAX_SCORES = 10;
const MAX_SCORE = 10_000_000;
const BAD = new Set(['ASS', 'FUK', 'FUC', 'FCK', 'FKU', 'CUM', 'DIC', 'DIK', 'KKK', 'NIG', 'NGR', 'NGA', 'SEX', 'TIT', 'FAG', 'COC', 'COK', 'CNT', 'KNT', 'JIZ', 'WNK', 'WTF', 'GAY', 'HOR', 'SHT', 'SLT', 'VAG', 'PUS', 'NAZ', 'HTL', 'RAP', 'PNS', 'XXX']);

// Returns { initials, score } or { error }.
function validate(data) {
  const initials = String((data && data.initials) || '').toUpperCase();
  const score = Number(data && data.score);
  if (!/^[A-Z]{3}$/.test(initials)) return { error: 'Initials must be 3 letters.' };
  if (BAD.has(initials)) return { error: 'Wash yer mooth oot. Try other initials.' };
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return { error: 'That score looks dodgy.' };
  return { initials, score };
}

// Adds entry to a copy of scores. Returns the new top 10 and the entry's rank (-1 if it didn't make it).
function insert(scores, entry) {
  const all = (Array.isArray(scores) ? scores : []).concat(entry);
  all.sort((a, b) => b.score - a.score || a.t - b.t);
  const top = all.slice(0, MAX_SCORES);
  return { scores: top, rank: top.indexOf(entry) };
}

const publicScores = (scores) => (Array.isArray(scores) ? scores : []).map(({ initials, score }) => ({ initials, score }));

// Allows up to `max` calls per `windowMs` from one IP. Lots of phones can share one IP on
// mobile networks, so this allows short bursts rather than one call at a time.
function makeWindowLimiter(max, windowMs) {
  const seen = new Map();
  return (ip) => {
    const now = Date.now();
    let w = seen.get(ip);
    if (!w || now - w.start > windowMs) { w = { start: now, n: 0 }; seen.set(ip, w); }
    w.n++;
    if (seen.size > 5000) seen.clear();
    return w.n > max;
  };
}

// Best-effort per-IP throttle: one call every `ms`.
function makeRateLimiter(ms = 3000) {
  const last = new Map();
  return (ip) => {
    const now = Date.now();
    const prev = last.get(ip) || 0;
    last.set(ip, now);
    if (last.size > 5000) last.clear();
    return now - prev < ms;
  };
}

module.exports = { validate, insert, publicScores, makeRateLimiter, makeWindowLimiter, MAX_SCORES };
