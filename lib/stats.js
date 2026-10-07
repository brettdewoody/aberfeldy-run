// Play statistics shared by server.js (self-hosted) and the Netlify function.
// Players are counted by an anonymous random id the game keeps in the browser;
// no names, IP addresses or cookies are stored.
'use strict';

const TYPES = new Set(['visit', 'run', 'finish']);
const MAX_SCORE = 10_000_000;
const MAX_DIST = 1_000_000;

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10); // UTC date, e.g. 2026-10-07

// Returns { type, pid, dist, score } or { error }.
function validateEvent(data) {
  const type = String((data && data.type) || '');
  const pid = String((data && data.pid) || '');
  if (!TYPES.has(type)) return { error: 'Unknown event' };
  if (!/^[a-z0-9]{8,40}$/.test(pid)) return { error: 'Bad player id' };
  const num = (v, max) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 && n <= max ? n : 0;
  };
  return { type, pid, dist: num(data.dist, MAX_DIST), score: num(data.score, MAX_SCORE) };
}

const emptyDay = () => ({ visits: 0, runs: 0, finishes: 0, dist: 0, best: 0, players: {} });

// Folds one event into a day's record (returns a new object).
function applyEvent(day, ev) {
  const d = Object.assign(emptyDay(), day || {});
  d.players = Object.assign({}, d.players);
  d.players[ev.pid] = 1;
  if (ev.type === 'visit') d.visits++;
  else if (ev.type === 'run') d.runs++;
  else if (ev.type === 'finish') {
    d.finishes++;
    d.dist += ev.dist;
    d.best = Math.max(d.best, ev.score);
  }
  return d;
}

// days: [{ date, rec }] in any order; allPlayers: number of distinct players ever.
function summarize(days, allPlayers) {
  const rows = days
    .map(({ date, rec }) => {
      const r = Object.assign(emptyDay(), rec || {});
      return { date, players: Object.keys(r.players).length, visits: r.visits, runs: r.runs, finishes: r.finishes, dist: r.dist, best: r.best };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  return {
    totals: {
      players: allPlayers,
      visits: sum('visits'),
      runs: sum('runs'),
      finishes: sum('finishes'),
      dist: sum('dist'),
      best: rows.reduce((m, r) => Math.max(m, r.best), 0),
    },
    days: rows,
  };
}

module.exports = { validateEvent, applyEvent, summarize, dayKey };
