// Play statistics shared by server.js (self-hosted) and the Netlify function.
// Only plain daily counts are kept. No identifier of any kind is sent or stored:
// "new players" is a count of visits the game flagged as a first visit.
'use strict';

const TYPES = new Set(['visit', 'run', 'finish']);
const MAX_SCORE = 10_000_000;
const MAX_DIST = 1_000_000;
const FIELDS = ['visits', 'newPlayers', 'runs', 'finishes', 'dist', 'best'];

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10); // UTC date, e.g. 2026-10-07

// Returns { type, first, dist, score } or { error }.
function validateEvent(data) {
  const type = String((data && data.type) || '');
  if (!TYPES.has(type)) return { error: 'Unknown event' };
  const num = (v, max) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 && n <= max ? n : 0;
  };
  return { type, first: !!data && data.first === true, dist: num(data.dist, MAX_DIST), score: num(data.score, MAX_SCORE) };
}

// Keeps only the count fields (also drops anything older versions stored, e.g. player ids).
function cleanDay(rec) {
  const d = {};
  for (const f of FIELDS) d[f] = Number(rec && rec[f]) || 0;
  return d;
}

// Folds one event into a day's record (returns a new object).
function applyEvent(day, ev) {
  const d = cleanDay(day);
  if (ev.type === 'visit') { d.visits++; if (ev.first) d.newPlayers++; }
  else if (ev.type === 'run') d.runs++;
  else if (ev.type === 'finish') { d.finishes++; d.dist += ev.dist; d.best = Math.max(d.best, ev.score); }
  return d;
}

// True if a stored record holds anything besides counts (so it should be rewritten clean).
const needsCleaning = (rec) => !!rec && Object.keys(rec).some((k) => !FIELDS.includes(k));

// days: [{ date, rec }] in any order.
function summarize(days) {
  const rows = days.map(({ date, rec }) => Object.assign({ date }, cleanDay(rec))).sort((a, b) => (a.date < b.date ? -1 : 1));
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  return {
    totals: {
      players: sum('newPlayers'),
      visits: sum('visits'),
      runs: sum('runs'),
      finishes: sum('finishes'),
      dist: sum('dist'),
      best: rows.reduce((m, r) => Math.max(m, r.best), 0),
    },
    days: rows,
  };
}

module.exports = { validateEvent, applyEvent, summarize, dayKey, cleanDay, needsCleaning };
