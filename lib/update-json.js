// Read-modify-write a JSON blob with an ETag check, retried if someone else wrote in between.
// fn(current) returns the new value, or null to leave it unchanged.
'use strict';

async function updateJSON(store, key, fn) {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, Math.random() * 40 * attempt));
    const cur = await store.getWithMetadata(key, { type: 'json' });
    const next = fn(cur ? cur.data : null);
    if (next === null) return true;
    const { modified } = await store.setJSON(key, next, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (modified) return true;
  }
  return false;
}

// Claims a one-time key. True the first time, false ever after.
async function claimOnce(store, key, value) {
  const { modified } = await store.setJSON(key, value, { onlyIfNew: true });
  return modified;
}

function envVar(name) {
  try { if (typeof Netlify !== 'undefined' && Netlify.env) return Netlify.env.get(name) || ''; } catch (e) { /* not on Netlify */ }
  return process.env[name] || '';
}

module.exports = { updateJSON, claimOnce, envVar };
