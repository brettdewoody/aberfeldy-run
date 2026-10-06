/* The Aberfeldy Jobbie Dash
 * A pseudo-3D endless runner. Dodge the dog poo on Aberfeldy's pavements.
 * Plain canvas, no dependencies. 1 world unit = 1 pavement lane ≈ 1 metre.
 */
(() => {
'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------- utilities
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function mix(c1, c2, t) {
  const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  const r = Math.round(lerp(a >> 16, b >> 16, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return `rgb(${r},${g},${bl})`;
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};
const FONT = '"Luckiest Guy", Impact, "Arial Black", sans-serif';

// ---------------------------------------------------------------- content
const SHOPS = [
  { name: 'THE WATERMILL', sub: 'Books · Coffee', front: '#22402f', accent: '#c9a227', sign: '#22402f', text: '#f4e7c1', door: '#16291e' },
  { name: 'BIRKS CINEMA', sub: 'NOW: 28 JOBBIES LATER', front: '#1f6f78', accent: '#f2c14e', sign: '#111111', text: '#f2c14e', door: '#0f3c41' },
  { name: 'TOWN HALL', sub: 'Pavement Complaints: Tue', front: '#8c8578', accent: '#3a3a3a', sign: '#1e2a4a', text: '#ffffff', door: '#4a3424' },
  { name: 'BLACK WATCH INN', sub: 'Real Ales · Nae Dugs', front: '#1d1d1d', accent: '#c8102e', sign: '#1d1d1d', text: '#e8d9a8', door: '#3b1010' },
  { name: 'CHIPPY', sub: 'Deep-fried Everything', front: '#1565c0', accent: '#ffffff', sign: '#ffffff', text: '#1565c0', door: '#0d3c75' },
  { name: 'BUTCHER', sub: 'Award-winning Haggis', front: '#8e1b1b', accent: '#f5f0e6', sign: '#f5f0e6', text: '#8e1b1b', door: '#4d0f0f' },
  { name: 'BAKERY', sub: 'Scotch Pies · Tablet', front: '#d98e3a', accent: '#5a3410', sign: '#5a3410', text: '#ffe6b0', door: '#6a3d14' },
  { name: 'KILTMAKER', sub: 'Tartan for All', front: '#2e3f7f', accent: '#c8102e', sign: '#2e3f7f', text: '#ffffff', door: '#1a2552' },
  { name: 'GIFT SHOP', sub: 'Tea Towels Galore', front: '#7b3f8c', accent: '#f7d84a', sign: '#f7d84a', text: '#4a1f57', door: '#46214f' },
  { name: 'OUTDOOR SHOP', sub: 'Waterproofs (Essential)', front: '#3e7d3a', accent: '#f18f01', sign: '#f18f01', text: '#1f3d1d', door: '#203f1e' },
  { name: 'PHARMACY', sub: 'Shoe Disinfectant', front: '#0f8a6a', accent: '#ffffff', sign: '#ffffff', text: '#0f8a6a', door: '#0a4d3c' },
  { name: 'POST OFFICE', sub: 'Stamps · Midge Spray', front: '#c8102e', accent: '#ffd400', sign: '#c8102e', text: '#ffd400', door: '#6b0818' },
];
const WALL_COLORS = ['#b9b2a3', '#9e978a', '#d8d2c4', '#c7b9a0', '#8f8a80', '#e9e4d8', '#a9a196', '#cfc4ae'];
const STREETS = ['DUNKELD ST', 'BANK ST', 'KENMORE ST', 'CHAPEL ST', 'THE SQUARE', 'TAYBRIDGE RD', 'CRIEFF RD', 'MILL ST'];

const EXCL = {
  hurdle: ['HURDLED!', 'BRAW!', 'OWER IT!', 'LOUP!', 'YASS!'],
  close: ['CLOSE SHAVE!', 'JINKED IT!', 'NAE BOTHER!', 'JINGS!', 'SHOOGLY!'],
  stomp: ['WELLY STOMP!', 'SQUELCH!', 'SPLODGE!', 'GET IT INTAE YE!'],
  milestone: ['PURE DEAD BRILLIANT!', 'GAUN YERSEL!', 'BRAW RUNNING!', 'CRIVVENS!', 'HELP MA BOAB!', 'WHIT A WEAN!', 'LEGEND!'],
  bag: ['+10', '+10', '+10', 'BAGGED!', '+10'],
};
const DEATH = {
  mega: ['Ran face-first into a MEGA JOBBIE.', 'That jobbie was the size of Schiehallion.', 'Ye cannae jump THAT, pal.'],
  small: ['Stood right in it.', 'Squelch. That\'s yer shoes ruined.', 'Didnae jump high enough.'],
  splat: ['Skited on a squashed one.', 'Slid through a pre-flattened beauty.', 'Someone else stood in that first.'],
  bagged: ['Tripped over a bag someone "picked up".', 'Bagged it, then dumped it. Classic.'],
  hang: ['Headbutted a bag of poo hanging from a tree.', 'Jumped straight intae the poo bag tree.'],
  swing: ['Clotheslined by a swinging poo bag.', 'The poo bag swung. You didnae.'],
  smear: ['Skidded right down a skid mark.', 'That skid mark went on forever.'],
};
const QUIPS = ['Och, that\'s mingin\'.', 'Help ma boab!', 'Pure honkin\'.', 'Yer maw\'s gonnae kill ye.', 'Every. Single. Time.', 'The Council will hear about this.', 'Smells like a Tuesday.'];

// Landmarks on the left verge. Wade's Bridge always comes first.
const LANDMARK_X = {
  bridge: -13, blackwatch: -7.2, distillery: -11, birks: -8.5, cows: -7.5, piper: -5.2, castle: -10, golf: -7.5,
  crannog: -10, taymouth: -11, dull: -5.8, yew: -7.5, footbridge: -12, rafting: -10,
};
const LANDMARK_W = {
  bridge: 9.5, blackwatch: 2, distillery: 7, birks: 5, cows: 3.5, piper: 1, castle: 5, golf: 3,
  crannog: 6, taymouth: 6.5, dull: 2.6, yew: 4, footbridge: 10, rafting: 6,
};
// Text for the big brown roadside sign before each landmark: [name, short line].
const LANDMARK_INFO = {
  bridge: ["WADE'S BRIDGE", 'BUILT 1733'],
  blackwatch: ['BLACK WATCH MEMORIAL', 'RAISED 1887'],
  distillery: ['ABERFELDY DISTILLERY', "DEWAR'S WHISKY"],
  birks: ["BIRKS O' ABERFELDY", 'FALLS · BURNS 1787'],
  cows: ['HIGHLAND COOS', 'DO NOT FEED'],
  piper: ['LIVE PIPER', 'ALL DAY. EVERY DAY.'],
  castle: ['CASTLE MENZIES', 'WEEM · CLAN SEAT'],
  golf: ['ABERFELDY GOLF CLUB', 'MIND THE 7TH'],
  crannog: ['CRANNOG CENTRE', 'IRON AGE LOCH HOUSES'],
  taymouth: ['TAYMOUTH CASTLE', 'KENMORE'],
  dull: ['DULL', 'TWINNED WITH BORING'],
  yew: ['FORTINGALL YEW', 'ANCIENT TREE'],
  footbridge: ['ABERFELDY FOOTBRIDGE', 'PLASTIC · 1992'],
  rafting: ['GRANDTULLY RAPIDS', 'WHITE-WATER RAFTING'],
};
// First time each hazard turns up in a session, the caption bar explains it.
const HAZARD_INFO = {
  mega: ['MEGA JOBBIE!', 'Too big to jump. Swipe to dodge it.'],
  hang: ['HANGING POO BAGS!', "Someone tied them to a tree. DON'T jump into them."],
  swing: ['SWINGING POO BAG!', 'Time it, or jump it.'],
  smear: ['SKID MARK!', 'A long one. Jump it or swerve.'],
  bagged: ['BAGGED... AND LEFT', 'Picked up, then abandoned. Jump it.'],
  dog: ['DUG ALERT!', "It's about to do its business."],
  bike: ['A BIKE!', 'Jump at the top to grab it. Ride the road, skip ahead.'],
};
const LM_KEYS = Object.keys(LANDMARK_X);

const POO = { splat: { h: 0.12 }, small: { h: 0.42 }, bagged: { h: 0.4 }, mega: { h: 99 } };
const LMSIGN_X = -4.55;   // post of the roadside landmark signs (board overhangs the road)
const BIKE_X = -2.45;     // riding line in the road, inside the centre line
const BIKE_TIME = 5;      // seconds on the bike
const BIKE_BOOST = 1.7;   // speed multiplier while riding
const HANG_LOW = 1.45; // bottom of a hanging bag: run under it, don't jump into it
const SWING = { ay: 3.7, len: 3.05, amp: 0.37 };

// ---------------------------------------------------------------- camera
const CAM_BACK = 3;
const NEAR_Z = -2.4;
const FAR_Z = 72;
const WALL_X = 1.75;
const KERB_X = -1.6;
const ROAD_X = -4.3;
let W = 0, H = 0, DPR = 1, cx = 0, horizonY = 0, F = 0, camH = 0, camX = 0;

function resize() {
  const r = canvas.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  cx = W / 2;
  horizonY = H * 0.33;
  const u = Math.min(W * 0.22, H * 0.15); // pixel width of one lane at the player
  F = u * CAM_BACK;
  camH = (H * 0.86 - horizonY) / u;
}
window.addEventListener('resize', resize);

function P(x, y, z) {
  const s = F / (z + CAM_BACK);
  return [cx + (x - camX) * s, horizonY + (camH - y) * s, s];
}
function poly(pts, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}
function clipZ(z0, z1) { return [Math.max(z0, NEAR_Z), Math.min(z1, FAR_Z)]; }
function quadGround(x0, x1, z0, z1, col) {
  [z0, z1] = clipZ(z0, z1); if (z1 <= z0) return;
  poly([P(x0, 0, z0), P(x1, 0, z0), P(x1, 0, z1), P(x0, 0, z1)], col);
}
function quadWall(x, y0, y1, z0, z1, col) {
  [z0, z1] = clipZ(z0, z1); if (z1 <= z0) return;
  poly([P(x, y0, z0), P(x, y0, z1), P(x, y1, z1), P(x, y1, z0)], col);
}
function quadTop(x0, x1, y, z0, z1, col) {
  [z0, z1] = clipZ(z0, z1); if (z1 <= z0) return;
  poly([P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)], col);
}
function quadFront(x0, x1, y0, y1, z, col) {
  if (z < NEAR_Z || z > FAR_Z) return;
  poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], col);
}
// Billboard: draw fn in local space where 100px = 1 world unit, origin at (x,y,z), y up is negative.
function sprite(x, y, z, halfW, fn) {
  const d = z + CAM_BACK;
  if (d < 0.35 || z > FAR_Z) return;
  const s = F / d;
  const sx = cx + (x - camX) * s;
  if (sx + halfW * s < -20 || sx - halfW * s > W + 20) return;
  const sy = horizonY + (camH - y) * s;
  ctx.save();
  ctx.globalAlpha = clamp((FAR_Z - z) / 12, 0, 1);
  ctx.translate(sx, sy);
  ctx.scale(s / 100, s / 100);
  fn();
  ctx.restore();
}

// ---------------------------------------------------------------- drawing helpers
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function ell(x, y, rx, ry, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU);
  ctx.fill();
}
function fitText(text, x, y, maxW, size, col, align = 'center') {
  ctx.font = `${size}px ${FONT}`;
  const m = ctx.measureText(text).width;
  if (m > maxW) ctx.font = `${size * maxW / m}px ${FONT}`;
  ctx.fillStyle = col;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}
function brownSign(text, x, y, w, h = 44) {
  // UK brown tourist-attraction sign, drawn oversized so it reads on a phone
  w *= 1.35; h = Math.max(h, 44) * 1.5;
  // landmarks sit off to the left, so slide the sign along to keep it on screen
  const m = ctx.getTransform(), pad = 6 * DPR;
  const left = m.a * (x - w / 2) + m.e, right = m.a * (x + w / 2) + m.e;
  if (left < pad) x += (pad - left) / m.a;
  else if (right > canvas.width - pad) x -= (right - (canvas.width - pad)) / m.a;
  ctx.fillStyle = '#6b3a1f';
  rr(x - w / 2, y - h, w, h, 6); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  rr(x - w / 2 + 4, y - h + 4, w - 8, h - 8, 4); ctx.stroke();
  fitText(text, x, y - h / 2 + 3, w - 22, h * 0.6, '#fff');
}
function flies(n, cxp, cyp, rx, ry, seed, size = 3) {
  const t = G.t;
  for (let j = 0; j < n; j++) {
    const a = t * (5 + (j % 3)) + j * 2.1 + seed;
    const fx = cxp + Math.cos(a) * rx;
    const fy = cyp + Math.sin(a * 1.4) * ry;
    const flap = Math.abs(Math.sin(t * 60 + j)) * size;
    ell(fx - size * 0.6, fy - size * 0.6, size * 0.7, flap * 0.6 + 0.5, 'rgba(255,255,255,0.75)');
    ell(fx + size * 0.6, fy - size * 0.6, size * 0.7, flap * 0.6 + 0.5, 'rgba(255,255,255,0.75)');
    ell(fx, fy, size, size * 0.8, '#111');
  }
}
function stink(n, w, top, seed, alpha = 0.6) {
  const t = G.t;
  ctx.lineWidth = Math.max(2, w * 0.05);
  ctx.lineCap = 'round';
  for (let j = 0; j < n; j++) {
    const ph = (t * 0.8 + j / n + seed) % 1;
    const x0 = (j - (n - 1) / 2) * w * 0.32;
    ctx.strokeStyle = `rgba(130,180,40,${alpha * Math.sin(ph * Math.PI)})`;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const yy = top - ph * w * 0.6 - i * w * 0.05;
      const xx = x0 + Math.sin(i * 0.9 + t * 5 + j) * w * 0.06;
      if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- sound (all synthesised)
const Sound = (() => {
  let ac = null, master = null, sfxGain = null, musicGain = null, noiseBuf = null;
  let muted = store.get('ajd_muted') === '1';
  let musicOn = false, nextNote = 0, idx = 0, tempo = 1, drones = [], silentEl = null;
  // A tiny silent WAV. Playing an <audio> element from a tap moves iOS Safari's audio
  // into "playback" mode, so Web Audio is heard even with the silent switch on.
  function silentWavUrl() {
    const n = 4000, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older iOS */ }
    try {
      if (!silentEl) {
        silentEl = new Audio(silentWavUrl());
        silentEl.loop = true;
        silentEl.setAttribute('playsinline', '');
      }
      const p = silentEl.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* no HTML audio */ }
  }
  // Must be called from a tap/click handler.
  function init() {
    unlock();
    if (ac) {
      // iOS uses 'interrupted' after calls/app switches, not just 'suspended'
      if (ac.state !== 'running') ac.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    if (ac.state !== 'running') ac.resume().catch(() => {});
    // play one silent sample inside the tap: the classic iOS unlock
    const b = ac.createBuffer(1, 1, 22050), src = ac.createBufferSource();
    src.buffer = b; src.connect(ac.destination); src.start(0);
    master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
    musicGain = ac.createGain(); musicGain.gain.value = 0.09; musicGain.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function tone(type, f0, f1, dur, vol = 0.4, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, type = 'lowpass', delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }
  const sfx = {
    jump() { tone('square', 280, 720, 0.16, 0.18); },
    land() { noise(0.06, 0.15, 600); },
    lane() { noise(0.09, 0.12, 2800, 'bandpass'); },
    bag() { tone('square', 988, null, 0.06, 0.15); tone('square', 1319, null, 0.12, 0.15, 0.06); },
    splat() { noise(0.7, 1, 700); tone('sine', 180, 35, 0.6, 0.9); tone('sawtooth', 90, 40, 0.5, 0.25, 0.05); },
    plop() { tone('sine', 700, 110, 0.2, 0.45); },
    stomp() { noise(0.3, 0.8, 1300); tone('sine', 140, 45, 0.3, 0.6); },
    close() { noise(0.25, 0.3, 1800, 'bandpass'); tone('triangle', 600, 1200, 0.12, 0.15); },
    welly() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('square', f, null, 0.14, 0.16, i * 0.07)); },
    bell() { for (const d of [0, 0.16]) { tone('sine', 2100, null, 0.35, 0.25, d); tone('sine', 2650, null, 0.3, 0.12, d); } },
    milestone() { [784, 988, 1175].forEach((f, i) => tone('triangle', f, null, 0.18, 0.25, i * 0.09)); },
  };
  // A made-up pipe tune in A mixolydian over a drone. C5 = C#5, F5 = F#5.
  const N = { G4: 392, A4: 440, B4: 493.9, C5: 554.4, D5: 587.3, E5: 659.3, F5: 740, G5: 784, A5: 880 };
  const TUNE = ('E5 A4 A4 C5 E5 A5 E5 C5 D5 F5 D5 B4 G4 B4 D5 B4 E5 A4 A4 C5 E5 A5 E5 C5 D5 B4 G4 B4 A4 A4 A4 - ' +
                'A5 G5 E5 C5 E5 A5 G5 E5 D5 F5 A5 F5 D5 B4 G4 B4 A5 G5 E5 C5 E5 G5 A5 E5 D5 B4 G4 B4 A4 A4 A4 -').split(' ');
  function chanter(f, t, dur) {
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 1.78, t); // high-G grace note
    o.frequency.setValueAtTime(f, t + 0.022);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2.2; bp.Q.value = 0.9;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.6, t + 0.008);
    g.gain.setValueAtTime(0.6, t + dur * 0.85);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(bp); bp.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function startMusic() {
    if (!ac || musicOn) return;
    musicOn = true;
    drones = [110, 220, 220.6].map((f, i) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      const g = ac.createGain(); g.gain.value = i ? 0.18 : 0.3;
      o.connect(lp); lp.connect(g); g.connect(musicGain); o.start();
      return o;
    });
    nextNote = ac.currentTime + 0.05; idx = 0;
  }
  function stopMusic() {
    musicOn = false;
    drones.forEach((o) => { try { o.stop(); } catch (e) { /* already stopped */ } });
    drones = [];
  }
  function tick() {
    if (!ac || !musicOn) return;
    const step = 0.17 / tempo;
    if (nextNote < ac.currentTime - 0.3) nextNote = ac.currentTime + 0.02;
    while (nextNote < ac.currentTime + 0.2) {
      const n = TUNE[idx % TUNE.length];
      if (n !== '-') chanter(N[n], nextNote, step * 0.96);
      nextNote += step; idx++;
    }
  }
  function sleep() { if (silentEl) silentEl.pause(); }
  function setMuted(m) {
    muted = m; store.set('ajd_muted', m ? '1' : '0');
    if (master) master.gain.value = m ? 0 : 1;
  }
  return { init, sleep, sfx, startMusic, stopMusic, tick, setMuted, setTempo(v) { tempo = v; }, get muted() { return muted; } };
})();

// ---------------------------------------------------------------- leaderboard
const BAD = ['ASS', 'FUK', 'FUC', 'FCK', 'FKU', 'CUM', 'DIC', 'DIK', 'KKK', 'NIG', 'NGR', 'NGA', 'SEX', 'TIT', 'FAG', 'COC', 'COK', 'CNT', 'KNT', 'JIZ', 'WNK', 'WTF', 'GAY', 'HOR', 'SHT', 'SLT', 'VAG', 'PUS', 'NAZ', 'HTL', 'RAP', 'PNS', 'XXX'];
class BoardError extends Error {}
const Board = (() => {
  const KEY = 'ajd_scores';
  let mode = 'global';
  const local = {
    get() { try { return JSON.parse(store.get(KEY) || '[]'); } catch (e) { return []; } },
    add(initials, score) {
      const entry = { initials, score, t: Date.now() };
      const all = local.get(); all.push(entry);
      all.sort((a, b) => b.score - a.score || a.t - b.t);
      const top = all.slice(0, 10);
      store.set(KEY, JSON.stringify(top));
      return { scores: top, rank: top.indexOf(entry) };
    },
  };
  async function fetchTop() {
    try {
      const r = await fetch('api/scores', { cache: 'no-store' });
      if (!r.ok) throw new Error('bad status');
      const j = await r.json();
      if (!Array.isArray(j.scores)) throw new Error('bad body');
      mode = 'global';
      return j.scores;
    } catch (e) {
      mode = 'local';
      return local.get();
    }
  }
  async function submit(initials, score) {
    let r;
    try {
      r = await fetch('api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initials, score }),
      });
    } catch (e) { mode = 'local'; return local.add(initials, score); }
    if (r.status === 400 || r.status === 429) {
      const j = await r.json().catch(() => ({}));
      throw new BoardError(j.error || 'Could not save that score.');
    }
    if (!r.ok) { mode = 'local'; return local.add(initials, score); }
    try {
      const j = await r.json();
      if (!Array.isArray(j.scores)) throw new Error('bad body');
      mode = 'global';
      return { scores: j.scores, rank: typeof j.rank === 'number' ? j.rank : -1 };
    } catch (e) { mode = 'local'; return local.add(initials, score); }
  }
  return { fetchTop, submit, get mode() { return mode; } };
})();

// ---------------------------------------------------------------- game state
let G = null;
let mode = 'title'; // title | play | dying | over | paused
let best = parseInt(store.get('ajd_best') || '0', 10) || 0;
const GRAV = 30, JUMP_V = 9.2;

function newGame(attract) {
  G = {
    attract, t: 0, dist: 0, speed: attract ? 6 : 10, bonus: 0, bags: 0, dodged: 0, score: 0,
    p: { lane: 1, x: 0, y: 0, vy: 0, air: false, fast: false, phase: 0, welly: 0, bike: 0, grace: 0, lastLane: -9, jumpBuf: 0 },
    objs: [], scen: [], blds: [], parts: [], floats: [], splats: [], drops: [],
    clouds: Array.from({ length: 6 }, () => ({ x: Math.random(), y: rand(0.03, 0.22), s: rand(0.6, 1.4), v: rand(0.004, 0.012) })),
    nextRow: 34, nextBld: NEAR_Z - 1, nextLamp: 5, nextTree: NEAR_Z, nextLM: 16, nextBin: 11, nextTractor: rand(80, 160),
    lmZones: [], lmOrder: ['bridge', ...shuffle(LM_KEYS.filter((k) => k !== 'bridge'))], lmIdx: 0,
    shake: 0, rain: 0, rainTarget: 0, nextWeather: rand(25, 40), milestone: 250, killer: null, dyingT: 0, flash: 0,
  };
  G.scen.push({ k: 'welcome', x: -4.9, wz: 7 });
  fillWorld();
}

function diff() { return clamp(G.t / 90, 0, 1); }

function fillWorld() {
  const horizon = G.dist + FAR_Z + 4;
  while (G.nextBld < horizon) {
    const len = rand(3.8, 6.5);
    const wall = pick(WALL_COLORS);
    G.blds.push({ z0: G.nextBld, z1: G.nextBld + len, h: rand(3.4, 6.4), wall, side: mix(wall, '#000000', 0.25), shop: pick(SHOPS) });
    G.nextBld += len + (Math.random() < 0.25 ? rand(0.8, 2.2) : 0);
  }
  while (G.nextLM < horizon) {
    const k = G.lmOrder[G.lmIdx++ % G.lmOrder.length];
    G.scen.push({ k, x: LANDMARK_X[k], wz: G.nextLM, seed: Math.random() * 10 });
    G.scen.push({ k: 'lmsign', x: LMSIGN_X, wz: G.nextLM - 4, lm: k });
    G.lmZones.push([G.nextLM - 3, G.nextLM + 3]);
    G.nextLM += rand(34, 46);
  }
  while (G.nextTree < horizon) {
    const z = G.nextTree;
    if (!G.lmZones.some(([a, b]) => z > a && z < b)) {
      G.scen.push({ k: 'tree', x: -rand(5, 9.5), wz: z, s: rand(0.8, 1.35), seed: Math.random() * 10 });
    }
    G.nextTree += rand(2.5, 6);
  }
  while (G.nextLamp < horizon) {
    const r = Math.random();
    G.scen.push({ k: 'lamp', x: KERB_X - 0.05, wz: G.nextLamp, sign: r < 0.45 ? 'fine' : r < 0.75 ? pick(STREETS) : null });
    G.nextLamp += rand(10, 14);
  }
  while (G.nextBin < horizon) {
    G.scen.push({ k: 'bin', x: WALL_X - 0.22, wz: G.nextBin, seed: Math.random() * 10 });
    G.nextBin += rand(18, 32);
  }
  if (!G.attract) {
    while (G.nextRow < horizon) {
      spawnRow(G.nextRow);
      const T = lerp(1.15, 0.5, diff());
      G.nextRow += Math.max(6, G.speed * T);
    }
  }
  if (G.dist > G.nextTractor) {
    G.scen.push({ k: 'tractor', x: -3.55, wz: G.dist + FAR_Z - 2, moving: 5 });
    G.nextTractor = G.dist + rand(200, 380);
  }
}

const laneX = (l) => l - 1;
function addPoo(lane, wz, size, extra) {
  G.objs.push(Object.assign({ k: 'poo', lane, x: laneX(lane), wz, size, seed: Math.random() * 10 }, extra));
}
function addBag(lane, wz, y = 0.45) { G.objs.push({ k: 'bag', lane, x: laneX(lane), wz, y }); }
function bagLine(lane, wz, n) { for (let i = 0; i < n; i++) addBag(lane, wz + i * 1.6); }
function bagArc(lane, wz) {
  const spread = G.speed * 0.11;
  for (let i = -2; i <= 2; i++) addBag(lane, wz + i * spread, 0.5 + 1.0 * (1 - (i / 2.6) ** 2));
}

function spawnRow(wz) {
  const d = diff();
  const L = () => randi(0, 2);
  if (wz < 60) {
    const l = L(); addPoo(l, wz, 'small');
    if (wz < 40) bagArc(l, wz);
    return;
  }
  const table = [
    ['single', 3], ['double', 1.2 + d * 1.5], ['mega1', 2.4], ['mega2', 0.4 + d * 2.6],
    ['wall', 0.3 + d * 1.4], ['dog', 1.1], ['bags', 1.1], ['megaSmall', 0.4 + d * 2],
    ['welly', G.p.welly > 0 || G.t < 15 ? 0 : 0.22],
    ['bagtree', G.t < 6 ? 0 : 1.3 + d], ['swing', G.t < 18 ? 0 : 0.7 + d * 1.4],
    ['smear', 0.9 + d], ['gauntlet', d < 0.35 ? 0 : d * 1.6],
    ['bike', G.t < 25 || G.p.bike > 0 || G.objs.some((o) => o.k === 'bike') ? 0 : 0.3],
  ];
  let r = Math.random() * table.reduce((s, e) => s + e[1], 0);
  let kind = table[0][0];
  for (const [k, w] of table) { if ((r -= w) < 0) { kind = k; break; } }
  const lanes = shuffle([0, 1, 2]);
  switch (kind) {
    case 'single': {
      const l = lanes[0];
      addPoo(l, wz, pick(['splat', 'small', 'small', 'bagged']));
      if (Math.random() < 0.5) bagArc(l, wz); else bagLine(lanes[1], wz - 2, 3);
      break;
    }
    case 'double':
      addPoo(lanes[0], wz, pick(['small', 'bagged'])); addPoo(lanes[1], wz, pick(['splat', 'small']));
      if (Math.random() < d) addPoo(lanes[2], wz + 0.8, 'splat'); else addBag(lanes[2], wz);
      break;
    case 'mega1':
      addPoo(lanes[0], wz, 'mega');
      if (Math.random() < 0.5) bagLine(lanes[1], wz - 1.6, 3);
      break;
    case 'mega2':
      addPoo(lanes[0], wz, 'mega'); addPoo(lanes[1], wz, 'mega');
      bagLine(lanes[2], wz - 3.2, 3);
      break;
    case 'wall':
      for (const l of lanes) addPoo(l, wz, Math.random() < 0.3 ? 'splat' : 'small');
      bagArc(lanes[0], wz);
      break;
    case 'megaSmall':
      addPoo(lanes[0], wz, 'mega'); addPoo(lanes[1], wz, 'small');
      if (Math.random() < d) addPoo(lanes[2], wz, 'splat'); else bagArc(lanes[1], wz);
      break;
    case 'dog': {
      const side = Math.random() < 0.5 ? -1 : 1;
      G.objs.push({ k: 'dog', x: side * 3.4, wz, dir: -side, target: laneX(lanes[0]), lane: lanes[0], state: 'wait', t: 0, mega: Math.random() < 0.3 + d * 0.3 });
      break;
    }
    case 'bags':
      bagLine(lanes[0], wz - 2, 6);
      break;
    case 'welly':
      G.objs.push({ k: 'welly', lane: lanes[0], x: laneX(lanes[0]), wz, y: 0.6 });
      break;
    case 'bagtree': {
      // Bags hang over two lanes. A splat under one of them means you can't run it or jump it.
      const hung = Math.random() < 0.4 + d * 0.4 ? [lanes[0], lanes[1]] : [lanes[0]];
      G.objs.push({ k: 'hang', wz, seed: Math.random() * 10, bags: hung.map((l) => ({ lane: l, x: laneX(l) })) });
      addPoo(lanes[0], wz, pick(['splat', 'small']));
      if (Math.random() < 0.5) addPoo(lanes[2], wz, 'small'); else bagArc(lanes[2], wz);
      break;
    }
    case 'swing':
      G.objs.push({ k: 'swing', wz, seed: Math.random() * 10, ph: rand(0, TAU), w: TAU / rand(1.5, 2.1) });
      break;
    case 'smear':
      G.objs.push({ k: 'smear', lane: lanes[0], x: laneX(lanes[0]), wz, len: rand(3, 3 + d * 2.5), seed: Math.random() * 10 });
      if (Math.random() < d) addPoo(lanes[1], wz + 1, pick(['small', 'bagged']));
      break;
    case 'bike':
      // The bike floats at the top of a jump, over a jobbie. Mega blocks the next lane;
      // the third lane is safe if you run under its hanging bag.
      addPoo(lanes[0], wz, 'small');
      G.objs.push({ k: 'bike', lane: lanes[0], x: laneX(lanes[0]), wz, y: 1.2 });
      addPoo(lanes[1], wz, 'mega');
      G.objs.push({ k: 'hang', wz, seed: Math.random() * 10, bags: [{ lane: lanes[2], x: laneX(lanes[2]) }] });
      break;
    case 'gauntlet':
      // Only lanes[2] gets through, and only with a jump.
      addPoo(lanes[0], wz, 'mega');
      G.objs.push({ k: 'hang', wz, seed: Math.random() * 10, bags: [{ lane: lanes[1], x: laneX(lanes[1]) }] });
      addPoo(lanes[1], wz, 'small');
      addPoo(lanes[2], wz, pick(['splat', 'small', 'bagged']));
      break;
  }
}

// ---------------------------------------------------------------- input
function move(dir) {
  if (mode !== 'play') return;
  const p = G.p;
  if (p.bike > 0) return; // steering's locked to the road while riding
  const nl = clamp(p.lane + dir, 0, 2);
  if (nl !== p.lane) { p.lane = nl; p.lastLane = G.t; Sound.sfx.lane(); }
}
function doJump() {
  const p = G.p;
  p.air = true; p.vy = JUMP_V; p.fast = false; p.jumpBuf = 0;
  Sound.sfx.jump();
}
function jump() {
  if (mode !== 'play') return;
  if (!G.p.air) doJump(); else G.p.jumpBuf = 0.18;
}
function drop() {
  if (mode !== 'play') return;
  if (G.p.air) { G.p.fast = true; G.p.vy = Math.min(G.p.vy, 0); }
}

window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  const k = e.key;
  if (mode === 'play') {
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { move(-1); e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { move(1); e.preventDefault(); }
    else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { jump(); e.preventDefault(); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { drop(); e.preventDefault(); }
    else if (k === 'p' || k === 'P' || k === 'Escape') pause();
  } else if (mode === 'title' && (k === ' ' || k === 'Enter')) { e.preventDefault(); startGame(); }
  else if (mode === 'paused' && (k === ' ' || k === 'Enter' || k === 'p' || k === 'P' || k === 'Escape')) { e.preventDefault(); resume(); }
});

let touch = null;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.changedTouches[0];
  touch = { x: t.clientX, y: t.clientY, used: false, id: t.identifier };
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!touch || touch.used) return;
  const t = [...e.changedTouches].find((c) => c.identifier === touch.id);
  if (!t) return;
  const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  const th = 24;
  if (Math.abs(dx) > th || Math.abs(dy) > th) {
    touch.used = true;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < 0) jump(); else drop();
  }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (touch && !touch.used) jump();
  touch = null;
}, { passive: false });
// Mouse: click to jump, drag to swipe (for desktop testing)
let mouse = null;
canvas.addEventListener('mousedown', (e) => { mouse = { x: e.clientX, y: e.clientY, used: false }; });
canvas.addEventListener('mousemove', (e) => {
  if (!mouse || mouse.used) return;
  const dx = e.clientX - mouse.x, dy = e.clientY - mouse.y;
  if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
    mouse.used = true;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1); else if (dy < 0) jump(); else drop();
  }
});
window.addEventListener('mouseup', () => { if (mouse && !mouse.used) jump(); mouse = null; });

// ---------------------------------------------------------------- effects
function floater(text, sub, opts = {}) {
  G.floats.push({ text, sub, t: 0, life: opts.life || 1.1, size: opts.size || 44, color: opts.color || '#ffd84d' });
  if (G.floats.length > 3) G.floats.shift();
}
function burst(sx, sy, n, colors, power = 1) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), v = rand(80, 520) * power;
    G.parts.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - rand(100, 400) * power, r: rand(3, 11) * power, life: rand(0.5, 1.1), t: 0, c: pick(colors) });
  }
}
const POO_COLS = ['#6b3d1a', '#8a5226', '#4a2a10', '#a0632e', '#5a3214'];
function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } }

function stomp(o) {
  o.dead = true;
  const [sx, sy] = P(o.x, 0.3, o.wz - G.dist);
  burst(sx, sy, o.size === 'mega' ? 50 : 22, POO_COLS, o.size === 'mega' ? 1.4 : 0.9);
  const pts = o.size === 'mega' ? 50 : 15;
  G.bonus += pts;
  floater(`+${pts}`, pick(EXCL.stomp), { color: '#ffe36b' });
  G.shake = Math.max(G.shake, o.size === 'mega' ? 14 : 7);
  Sound.sfx.stomp();
  vibrate(30);
}

function die(o) {
  mode = 'dying';
  G.killer = o.size || o.k;
  G.dyingT = 0;
  G.shake = 26;
  G.flash = 1;
  const [sx, sy] = P(G.p.x, 0.5, 0);
  burst(sx, sy, 90, POO_COLS, 1.6);
  for (let i = 0; i < 9; i++) {
    G.splats.push({ x: rand(0.05, 0.95) * W, y: rand(0.1, 0.8) * H, r: rand(28, 80), drip: rand(20, 120), seed: Math.random() * 10 });
  }
  Sound.sfx.splat();
  Sound.stopMusic();
  vibrate([90, 40, 200]);
  hud.pause.classList.add('hidden');
}

// ---------------------------------------------------------------- update
function update(dt) {
  G.t += dt;
  const p = G.p;
  if (mode === 'play' || G.attract) {
    if (!G.attract) G.speed = Math.min(30, 10 + G.t * 0.21);
    const prev = G.dist;
    G.dist += G.speed * (p.bike > 0 ? BIKE_BOOST : 1) * dt;
    Sound.setTempo(0.85 + (G.speed - 10) / 20 * 0.45);

    // player
    const slow = p.bike > 0 || p.grace > 0; // swerving on/off the road takes a moment
    p.x += ((p.bike > 0 ? BIKE_X : laneX(p.lane)) - p.x) * Math.min(1, dt * (slow ? 5 : 17));
    if (p.bike > 0) {
      p.bike -= dt;
      if (p.bike <= 0) { p.bike = 0; p.grace = 1.2; p.lane = 1; floater('BACK ON THE PAVEMENT', 'Mind yer step', { color: '#fff', size: 30 }); }
    }
    p.grace = Math.max(0, p.grace - dt);
    if (p.air) {
      p.vy -= GRAV * (p.fast ? 3.2 : 1) * dt;
      p.y += p.vy * dt;
      if (p.y <= 0) {
        p.y = 0; p.vy = 0; p.air = false; p.fast = false;
        Sound.sfx.land();
        if (p.jumpBuf > 0) doJump();
      }
    }
    p.jumpBuf = Math.max(0, p.jumpBuf - dt);
    p.phase += dt * (6 + G.speed * 0.45);
    if (p.welly > 0) {
      p.welly -= dt;
      if (p.welly <= 0) floater('WELLIES AFF', 'Back tae normal shoes', { color: '#fff', size: 34 });
    }

    if (!G.attract) { updateObjs(dt, prev); updateCaptions(); }

    for (const s of G.scen) if (s.moving) s.wz += s.moving * dt;

    fillWorld();
    const cut = G.dist + NEAR_Z - 1;
    G.objs = G.objs.filter((o) => o.wz > cut && !(o.k === 'dog' && Math.abs(o.x) > 7));
    G.scen = G.scen.filter((s) => s.wz > cut - 4);
    G.blds = G.blds.filter((b) => b.z1 > cut);
    G.lmZones = G.lmZones.filter((z) => z[1] > cut);

    if (!G.attract) {
      G.score = Math.floor(G.dist) + G.bags * 10 + G.bonus;
      if (G.dist >= G.milestone) {
        floater(`${G.milestone}M!`, pick(EXCL.milestone), { size: 54 });
        G.milestone += 250;
        Sound.sfx.milestone();
      }
    }

    // weather: it's Scotland
    G.nextWeather -= dt;
    if (G.nextWeather <= 0) {
      G.rainTarget = G.rainTarget > 0 ? 0 : 1;
      G.nextWeather = G.rainTarget ? rand(14, 24) : rand(25, 45);
      if (G.rainTarget && !G.attract) floater('TYPICAL.', 'It\'s started raining', { color: '#bfe3ff', size: 40, life: 1.6 });
    }
  } else if (mode === 'dying') {
    G.dyingT += dt;
    if (G.dyingT > 1.6) gameOver();
  }
  G.rain += (G.rainTarget - G.rain) * Math.min(1, dt * 0.6);

  camX = lerp(camX, p.x * 0.35, Math.min(1, dt * 8));

  for (const c of G.clouds) { c.x -= c.v * dt; if (c.x < -0.3) { c.x = 1.3; c.y = rand(0.03, 0.22); } }

  for (const q of G.parts) { q.t += dt; q.vy += 1300 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  G.parts = G.parts.filter((q) => q.t < q.life);
  for (const f of G.floats) f.t += dt;
  G.floats = G.floats.filter((f) => f.t < f.life);
  G.shake = Math.max(0, G.shake - dt * 40);
  G.flash = Math.max(0, G.flash - dt * 2.5);

  // rain drops (screen space)
  const want = Math.floor(G.rain * 140);
  while (G.drops.length < want) G.drops.push({ x: rand(0, W), y: rand(-H, H), v: rand(700, 1100), l: rand(10, 24) });
  if (G.drops.length > want) G.drops.length = want;
  for (const d of G.drops) { d.y += d.v * dt; d.x -= d.v * 0.15 * dt; if (d.y > H) { d.y = rand(-60, -10); d.x = rand(0, W * 1.15); } }
}

function swingPos(o) {
  const th = SWING.amp * Math.sin(G.t * o.w + o.ph);
  const kx = SWING.len * Math.sin(th), ky = SWING.ay - SWING.len * Math.cos(th);
  return { th, x: kx, y: ky - 0.3, top: ky - 0.02 }; // knot (kx,ky); bag body hangs below it
}
function bootBag(x, y, z) {
  const [sx, sy] = P(x, y, Math.max(z, 0));
  burst(sx, sy, 26, ['#1f2a1f', '#3b4a3b', ...POO_COLS], 1.1);
  G.bonus += 30;
  floater('+30', 'BOOTED IT!', { color: '#ffe36b' });
  Sound.sfx.stomp();
}

function updateObjs(dt, prev) {
  const p = G.p;
  const immune = p.bike > 0 || p.grace > 0;
  for (const o of G.objs) {
    const zNow = o.wz - G.dist, zPrev = o.wz - prev;
    if (o.k === 'dog') { updateDog(o, dt, zNow); continue; }
    if (o.dead) continue;
    const overlap = zNow < 0.35 && zPrev > -0.35;
    const dx = Math.abs(o.x - p.x);
    if (o.k === 'poo') {
      if (overlap && dx < 0.58 && !immune) {
        if (o.size === 'mega' || p.y < POO[o.size].h) {
          if (p.welly > 0) { stomp(o); continue; }
          die(o); return;
        }
        o.jumped = true;
      }
      if (!o.passed && zNow < -0.35) {
        o.passed = true;
        G.dodged++;
        if (o.jumped) { G.bonus += 10; floater('+10', pick(EXCL.hurdle)); }
        else if (o.size === 'mega' && dx < 1.6 && G.t - p.lastLane < 0.7) {
          G.bonus += 25; floater('+25', pick(EXCL.close), { color: '#7dff7a' }); Sound.sfx.close();
        }
      }
    } else if (o.k === 'hang') {
      for (const b of o.bags) {
        if (immune || b.dead || !overlap || Math.abs(b.x - p.x) > 0.5 || p.y + 1.3 < HANG_LOW) continue;
        if (p.welly > 0) { b.dead = true; bootBag(b.x, 1.7, zNow); continue; }
        die(o); return;
      }
      if (!o.passed && zNow < -0.35) { o.passed = true; G.dodged += o.bags.length; }
    } else if (o.k === 'swing') {
      const sw = swingPos(o);
      if (!immune && !o.dead && overlap && Math.abs(sw.x - p.x) < 0.48 && p.y < sw.top) {
        if (p.welly > 0) { o.dead = true; bootBag(sw.x, sw.y, zNow); continue; }
        die(o); return;
      }
      if (!o.passed && zNow < -0.35) {
        o.passed = true; G.dodged++;
        if (Math.abs(sw.x - p.x) < 1.1) { G.bonus += 20; floater('+20', pick(EXCL.close), { color: '#7dff7a' }); Sound.sfx.close(); }
      }
    } else if (o.k === 'smear') {
      const on = !immune && zNow < 0.35 && zNow + o.len > -0.35 && dx < 0.5;
      if (on && p.y < 0.1) {
        if (p.welly > 0) { /* wellies don't care */ } else { die(o); return; }
      }
      if (on && p.y >= 0.1) o.jumped = true;
      if (!o.passed && zNow + o.len < -0.35) {
        o.passed = true; G.dodged++;
        if (o.jumped) { G.bonus += 15; floater('+15', 'LANG LOUP!'); }
      }
    } else if (o.k === 'bike') {
      if (overlap && dx < 0.55 && p.y > 0.9 && p.bike <= 0) {
        o.dead = true;
        p.bike = BIKE_TIME;
        const [sx, sy] = P(o.x, o.y, Math.max(zNow, 0));
        burst(sx, sy, 30, ['#e53935', '#ffffff', '#ffd400'], 1);
        G.bonus += 50;
        floater('ON YER BIKE!', '+50 · Skip ahead!', { color: '#ff6b6b', size: 54, life: 1.6 });
        Sound.sfx.bell();
        vibrate(40);
      }
    } else if (o.k === 'bag' || o.k === 'welly') {
      if (overlap && dx < 0.62 && o.y > p.y - 0.35 && o.y < p.y + 1.55) {
        o.dead = true;
        const [sx, sy] = P(o.x, o.y, Math.max(zNow, 0));
        if (o.k === 'bag') {
          G.bags++;
          burst(sx, sy, 8, ['#3fbf3f', '#9cf59c', '#ffffff'], 0.5);
          Sound.sfx.bag();
          if (G.bags % 10 === 0) floater(`${G.bags} BAGS!`, 'Tidy Aberfeldy hero', { color: '#7dff7a', size: 40 });
        } else {
          p.welly = 6;
          burst(sx, sy, 30, ['#ffd400', '#fff3a0', '#ffffff'], 1);
          floater('WELLY TIME!', 'Stomp the lot!', { color: '#ffd400', size: 56, life: 1.6 });
          Sound.sfx.welly();
          vibrate(40);
        }
      }
    }
  }
}

const introduced = new Set();
function updateCaptions() {
  for (const o of G.objs) {
    const key = o.k === 'poo' ? o.size : o.k;
    if (!HAZARD_INFO[key] || introduced.has(key)) continue;
    const z = o.wz - G.dist;
    if (z < 34 && z > 4 && (o.k !== 'dog' || o.state !== 'wait')) {
      introduced.add(key);
      showCaption(HAZARD_INFO[key][0], HAZARD_INFO[key][1], true);
    }
  }
}

function updateDog(o, dt, z) {
  o.t += dt;
  if (o.state === 'wait') { if (z < 46) o.state = 'in'; return; }
  if (o.state === 'in') {
    const step = 6 * dt * Math.sign(o.target - o.x);
    if (Math.abs(o.target - o.x) <= Math.abs(step)) { o.x = o.target; o.state = 'poop'; o.t = 0; }
    else o.x += step;
  } else if (o.state === 'poop') {
    if (o.t > 0.45 && !o.done) {
      o.done = true;
      addPoo(o.lane, o.wz - 0.3, o.mega ? 'mega' : 'small', { born: G.t });
      if (z < 40) Sound.sfx.plop();
    }
    if (o.t > 0.7) o.state = 'out';
  } else {
    o.x += o.dir * 7 * dt;
  }
}

// ---------------------------------------------------------------- render: world
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, horizonY);
  g.addColorStop(0, mix('#4aa3df', '#5b6673', G.rain));
  g.addColorStop(1, mix('#d8f0fa', '#9aa3ab', G.rain));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, horizonY + 2);
  for (const c of G.clouds) {
    const x = c.x * W, y = c.y * H, s = c.s * W * 0.08;
    const col = G.rain > 0.3 ? 'rgba(120,128,138,0.95)' : 'rgba(255,255,255,0.9)';
    ell(x, y, s * 1.6, s * 0.55, col); ell(x - s * 0.8, y + s * 0.1, s, s * 0.45, col); ell(x + s * 0.5, y - s * 0.3, s * 0.9, s * 0.6, col);
  }
}

function drawMountains() {
  const off = -camX * 6;
  // far range
  ctx.fillStyle = mix('#8fa4bf', '#7a838e', G.rain);
  ctx.beginPath(); ctx.moveTo(0, horizonY);
  for (let x = 0; x <= W; x += 8) {
    const xx = x + off * 0.5;
    ctx.lineTo(x, horizonY - H * 0.05 - Math.sin(xx * 0.012) * H * 0.02 - Math.sin(xx * 0.031 + 1) * H * 0.012);
  }
  ctx.lineTo(W, horizonY); ctx.fill();
  // Schiehallion: steep to the west, long ridge east
  const px = W * 0.6 + off, top = horizonY - H * 0.16;
  ctx.fillStyle = mix('#6f7fa3', '#646c78', G.rain);
  ctx.beginPath();
  ctx.moveTo(px - W * 0.26, horizonY);
  ctx.quadraticCurveTo(px - W * 0.07, top + H * 0.03, px, top);
  ctx.quadraticCurveTo(px + W * 0.12, top + H * 0.035, px + W * 0.5, horizonY);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.moveTo(px - W * 0.26, horizonY); ctx.quadraticCurveTo(px - W * 0.07, top + H * 0.03, px, top); ctx.lineTo(px - W * 0.02, horizonY); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `${Math.max(10, H * 0.014)}px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('SCHIEHALLION', px, top - 6);
  // near green hills
  ctx.fillStyle = mix('#4f8a3b', '#3f6040', G.rain);
  ctx.beginPath(); ctx.moveTo(0, horizonY + 2);
  for (let x = 0; x <= W; x += 6) {
    const xx = x + off;
    ctx.lineTo(x, horizonY - H * 0.02 - Math.max(0, Math.sin(xx * 0.02 + 2)) * H * 0.025 - Math.sin(xx * 0.07) * 3);
  }
  ctx.lineTo(W, horizonY + 2); ctx.fill();
}

function drawGround() {
  ctx.fillStyle = mix('#5d9c3a', '#4b7a3c', G.rain);
  ctx.fillRect(0, horizonY, W, H - horizonY);
  // road
  quadGround(ROAD_X, KERB_X - 0.15, NEAR_Z, FAR_Z, mix('#4d4f55', '#34363b', G.rain));
  quadGround(ROAD_X + 0.12, ROAD_X + 0.2, NEAR_Z, FAR_Z, '#e8e8e8');
  // double yellow lines (no parking, obviously)
  quadGround(KERB_X - 0.42, KERB_X - 0.36, NEAR_Z, FAR_Z, '#f5c518');
  quadGround(KERB_X - 0.3, KERB_X - 0.24, NEAR_Z, FAR_Z, '#f5c518');
  // centre dashes
  const dash = 4;
  for (let n = Math.floor((G.dist + NEAR_Z) / dash); n * dash < G.dist + FAR_Z; n++) {
    const z0 = n * dash - G.dist;
    quadGround(-3.0, -2.9, z0, z0 + 2, '#f2f2f2');
  }
  // kerb
  quadGround(KERB_X - 0.15, KERB_X, NEAR_Z, FAR_Z, '#d9d6cf');
  // pavement slabs
  const slab = 1.2;
  const wet = G.rain;
  const c1 = mix('#bdb8ae', '#8d8a85', wet), c2 = mix('#b0aba1', '#84817b', wet);
  for (let n = Math.floor((G.dist + NEAR_Z) / slab); n * slab < G.dist + FAR_Z; n++) {
    const z0 = n * slab - G.dist;
    quadGround(KERB_X, WALL_X, z0, z0 + slab, n % 2 ? c1 : c2);
  }
  // slab joints that double as lane hints
  const jc = 'rgba(70,64,56,0.35)';
  quadGround(-0.52, -0.48, NEAR_Z, FAR_Z, jc);
  quadGround(0.48, 0.52, NEAR_Z, FAR_Z, jc);
  // building base shadow
  quadGround(WALL_X - 0.12, WALL_X, NEAR_Z, FAR_Z, 'rgba(0,0,0,0.18)');
  // skid marks lie flat on the pavement
  for (const o of G.objs) {
    if (o.k !== 'smear') continue;
    const z = o.wz - G.dist;
    if (z + o.len < NEAR_Z || z > FAR_Z) continue;
    // one smooth streak, wobbly edges, tapering at both ends
    const n = 16, l = [], r = [];
    for (let i = 0; i <= n; i++) {
      const zz = Math.max(z + (o.len * i) / n, NEAR_Z);
      const taper = Math.sin((i / n) * Math.PI) ** 0.5;
      const w = (0.16 + 0.07 * Math.sin(i * 1.3 + o.seed)) * taper + 0.03;
      const off = Math.sin(i * 0.5 + o.seed) * 0.08;
      l.push(P(o.x + off - w, 0, zz)); r.unshift(P(o.x + off + w, 0, zz));
    }
    poly(l.concat(r), '#6b3d1a');
    const c = [];
    for (let i = 1; i < n; i++) c.push(P(o.x + Math.sin(i * 0.5 + o.seed) * 0.08 - 0.03, 0, Math.max(z + (o.len * i) / n, NEAR_Z)));
    for (let i = n - 1; i >= 1; i--) c.push(P(o.x + Math.sin(i * 0.5 + o.seed) * 0.08 + 0.05, 0, Math.max(z + (o.len * i) / n, NEAR_Z)));
    poly(c, '#3b2412');
  }
}

function drawBuildings() {
  const X = WALL_X, X2 = WALL_X + 4;
  for (let i = G.blds.length - 1; i >= 0; i--) {
    const b = G.blds[i];
    const z0 = b.z0 - G.dist, z1 = b.z1 - G.dist;
    if (z1 < NEAR_Z || z0 > FAR_Z) continue;
    const h = b.h, s = b.shop;
    if (z0 > NEAR_Z) quadFront(X, X2, 0, h, z0, b.side);
    if (h < camH) quadTop(X, X2, h, z0, z1, '#4b5059');
    quadWall(X, 0, h, z0, z1, b.wall);
    quadWall(X, h - 0.2, h, z0, z1, 'rgba(0,0,0,0.22)');
    const a = z0 + 0.15, e = z1 - 0.15;
    quadWall(X, 0, 2.1, a, e, s.front);
    quadWall(X, 1.72, 2.05, a, e, s.accent);
    quadWall(X, 0.45, 1.55, a + 0.25, e - 1.25, '#2c3e50');
    quadWall(X, 1.05, 1.5, a + 0.45, a + 1.1, 'rgba(255,255,255,0.18)');
    quadWall(X, 0, 1.62, e - 1.05, e - 0.35, s.door);
    for (let y = 2.6; y + 1.0 < h - 0.25; y += 1.4) {
      for (let wz = a + 0.45; wz + 0.65 < e; wz += 1.3) {
        quadWall(X, y, y + 0.95, wz, wz + 0.65, '#ece7da');
        quadWall(X, y + 0.07, y + 0.88, wz + 0.07, wz + 0.58, '#3a4d63');
      }
    }
  }
}

// ---------------------------------------------------------------- render: sprites
function drawPoo(o) {
  const t = G.t;
  let sc = 1, plop = 0;
  if (o.born != null) {
    const a = t - o.born;
    if (a < 0.35) sc = 0.3 + 0.7 * (a / 0.35) + Math.sin(a * 30) * 0.1 * (1 - a / 0.35);
    plop = clamp(1.2 - a, 0, 1);
  }
  ctx.save();
  ctx.scale(sc, sc);
  ell(0, 0, o.size === 'mega' ? 62 : 32, o.size === 'mega' ? 12 : 6, 'rgba(0,0,0,0.25)');
  if (o.size === 'bagged') {
    // a full bag, knotted and left on the pavement
    ctx.fillStyle = '#1d261d'; ctx.strokeStyle = '#0b0f0b'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-26, -4); ctx.quadraticCurveTo(-34, -30, -10, -36); ctx.lineTo(-6, -44); ctx.lineTo(-16, -56);
    ctx.lineTo(0, -46); ctx.lineTo(16, -56); ctx.lineTo(6, -44); ctx.lineTo(10, -36);
    ctx.quadraticCurveTo(34, -30, 26, -4); ctx.quadraticCurveTo(0, 4, -26, -4); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ell(-12, -22, 5, 9, 'rgba(255,255,255,0.22)');
    ell(8, -14, 9, 6, 'rgba(110,62,26,0.55)');
    fitText('WHY?!', 0, -78, 70, 22, '#fff');
    flies(3, 0, -40, 34, 14, o.seed, 2.8);
    stink(2, 54, -50, o.seed, 0.45);
  } else if (o.size === 'splat') {
    ctx.fillStyle = '#5a3214';
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * TAU, r = 1 + Math.sin(i * 2.7 + o.seed) * 0.25;
      ctx.lineTo(Math.cos(a) * 36 * r, -6 + Math.sin(a) * 9 * r);
    }
    ctx.fill();
    ell(-6, -9, 16, 5, '#7a4820');
    ell(10, -8, 8, 3.5, '#8a5226');
    ell(-12, -11, 5, 2, 'rgba(255,255,255,0.35)');
    flies(2, 0, -24, 24, 8, o.seed, 2.5);
  } else {
    const mega = o.size === 'mega';
    const w = mega ? 105 : 54, h = mega ? 200 : 42, tiers = mega ? 6 : 3;
    const wob = mega ? Math.sin(t * 3 + o.seed) * 3 : 0;
    for (let i = 0; i < tiers; i++) {
      const f = i / tiers;
      const rw = (w / 2) * (1 - f * 0.62);
      const ry = (h / tiers) * 0.72;
      const cy = -(h / tiers) * (i + 0.55);
      const ox = (i % 2 ? 1 : -1) * w * 0.03 + wob * f;
      const g = ctx.createRadialGradient(ox - rw * 0.35, cy - ry * 0.5, 1, ox, cy, rw * 1.1);
      g.addColorStop(0, '#b0743a'); g.addColorStop(0.5, '#6e3f1b'); g.addColorStop(1, '#3a1f0a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(ox, cy, rw, ry, 0, 0, TAU); ctx.fill();
      ell(ox - rw * 0.45, cy - ry * 0.35, rw * 0.22, ry * 0.25, 'rgba(255,255,255,0.3)');
    }
    // tip curl
    const tipY = -h * 0.97, tw = w * 0.13;
    ctx.fillStyle = '#6e3f1b';
    ctx.beginPath();
    ctx.moveTo(-tw + wob, tipY + tw * 0.8);
    ctx.quadraticCurveTo(-tw * 0.2 + wob, tipY - tw * 1.6, tw * 1.4 + wob, tipY - tw * 0.6);
    ctx.quadraticCurveTo(tw * 0.4 + wob, tipY - tw * 0.2, tw + wob, tipY + tw * 0.8);
    ctx.fill();
    if (mega) {
      // angry googly eyes
      const ey = -h * 0.6;
      for (const sx of [-1, 1]) {
        ell(sx * 17 + wob * 0.6, ey, 14, 16, '#fff');
        const lx = Math.sin(t * 2 + o.seed) * 3;
        ell(sx * 17 + lx + wob * 0.6, ey + 5, 7, 7, '#111');
        ell(sx * 17 + lx + 2 + wob * 0.6, ey + 2, 2, 2, '#fff');
      }
      ctx.strokeStyle = '#2a1405'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-32, ey - 24); ctx.lineTo(-8, ey - 13); ctx.moveTo(32, ey - 24); ctx.lineTo(8, ey - 13); ctx.stroke();
      // grin
      ctx.fillStyle = '#2a1405';
      ctx.beginPath(); ctx.moveTo(-20, -h * 0.38); ctx.quadraticCurveTo(0, -h * 0.26, 20, -h * 0.38); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-12, -h * 0.385, 7, 6); ctx.fillRect(4, -h * 0.385, 7, 6);
      stink(4, w, -h * 1.02, o.seed, 0.75);
      flies(6, 0, -h * 0.75, w * 0.75, h * 0.35, o.seed, 4);
    } else {
      stink(2, w, -h, o.seed, 0.5);
      flies(3, 0, -h * 0.8, w * 0.6, h * 0.4, o.seed, 2.5);
    }
  }
  ctx.restore();
  if (plop > 0) {
    ctx.globalAlpha *= plop;
    ctx.lineWidth = 8; ctx.strokeStyle = '#3b2412';
    ctx.font = `${o.size === 'mega' ? 70 : 46}px ${FONT}`; ctx.textAlign = 'center';
    const y = (o.size === 'mega' ? -240 : -80) - (1 - plop) * 40;
    ctx.strokeText('PLOP!', 0, y); ctx.fillStyle = '#ffd84d'; ctx.fillText('PLOP!', 0, y);
  }
}

function drawBag(o) {
  const t = G.t;
  const bob = Math.sin(t * 4 + o.wz) * 6;
  ctx.translate(0, bob);
  ell(0, 0, 26, 26, 'rgba(255,255,140,0.25)');
  ctx.scale(Math.max(0.25, Math.abs(Math.cos(t * 3 + o.wz))), 1);
  ctx.fillStyle = '#3fbf3f'; ctx.strokeStyle = '#1b6e20'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-13, -8); ctx.quadraticCurveTo(-18, 18, 0, 19); ctx.quadraticCurveTo(18, 18, 13, -8);
  ctx.lineTo(9, -11); ctx.lineTo(12, -22); ctx.lineTo(3, -12); ctx.lineTo(-3, -12); ctx.lineTo(-12, -22); ctx.lineTo(-9, -11);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ell(-6, 0, 3, 7, 'rgba(255,255,255,0.45)');
}

function drawWelly(o) {
  const t = G.t;
  ctx.translate(0, Math.sin(t * 4) * 8);
  ell(0, 0, 42, 42, `rgba(255,220,0,${0.25 + Math.sin(t * 8) * 0.1})`);
  for (let i = 0; i < 6; i++) {
    const a = t * 2 + (i * TAU) / 6;
    ell(Math.cos(a) * 40, Math.sin(a) * 40, 4, 4, '#fff');
  }
  for (const sx of [-12, 12]) {
    ctx.fillStyle = '#ffd400'; ctx.strokeStyle = '#8a6d00'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - 9, -26); ctx.lineTo(sx + 7, -26); ctx.lineTo(sx + 7, 8); ctx.lineTo(sx + 16, 10);
    ctx.quadraticCurveTo(sx + 20, 22, sx + 10, 22); ctx.lineTo(sx - 9, 22); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c99700'; ctx.fillRect(sx - 9, -26, 16, 6);
  }
}

function drawBikePickup(o) {
  const t = G.t;
  ctx.translate(0, Math.sin(t * 4) * 6);
  ell(0, -10, 62, 50, `rgba(255,80,80,${0.22 + Math.sin(t * 8) * 0.08})`);
  for (let i = 0; i < 6; i++) { const a = t * 2 + (i * TAU) / 6; ell(Math.cos(a) * 58, -10 + Math.sin(a) * 46, 4, 4, '#fff'); }
  ctx.strokeStyle = '#151515'; ctx.lineWidth = 6;
  for (const wx of [-30, 30]) {
    ctx.beginPath(); ctx.arc(wx, 0, 20, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(wx, 0); ctx.rotate(t * 8);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.moveTo(0, -18); ctx.lineTo(0, 18); ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = '#e53935'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-6, -30); ctx.lineTo(22, -30); ctx.lineTo(30, 0); ctx.moveTo(-6, -30); ctx.lineTo(4, 0); ctx.lineTo(22, -30);
  ctx.moveTo(-10, -40); ctx.lineTo(-6, -30); ctx.moveTo(22, -30); ctx.lineTo(18, -44); ctx.stroke();
  ctx.strokeStyle = '#151515'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-18, -41); ctx.lineTo(-4, -41); ctx.moveTo(12, -46); ctx.lineTo(26, -44); ctx.stroke();
  ctx.font = `30px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#3b2412';
  ctx.strokeText('BIKE!', 0, -62); ctx.fillStyle = '#ffd84d'; ctx.fillText('BIKE!', 0, -62);
}

function drawDog(o) {
  const t = G.t;
  const squat = o.state === 'poop';
  ctx.scale(o.dir, 1);
  const run = squat || o.state === 'wait' ? 0 : Math.sin(t * 24);
  ell(0, 0, 34, 6, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = '#151515';
  // legs
  const legs = [[-20, run], [-12, -run], [16, -run], [24, run]];
  for (const [lx, r] of legs) { ctx.save(); ctx.translate(lx, -14); ctx.rotate(r * 0.5); ctx.fillRect(-3, 0, 7, 15); ctx.restore(); }
  ctx.save();
  if (squat) { ctx.translate(-10, 4); ctx.rotate(-0.25); }
  ell(0, -24, 30, 13, '#151515');
  // skirt fur
  ctx.beginPath(); ctx.moveTo(-26, -20); for (let i = 0; i <= 8; i++) ctx.lineTo(-26 + i * 6.5, -12 + (i % 2) * 4); ctx.lineTo(26, -22); ctx.fill();
  // tail
  ctx.beginPath(); ctx.moveTo(-26, -30); ctx.lineTo(-36, -50 + Math.sin(t * 20) * 4); ctx.lineTo(-30, -28); ctx.fill();
  // head
  ell(30, -38, 13, 12, '#151515');
  ctx.beginPath(); ctx.moveTo(24, -46); ctx.lineTo(26, -62); ctx.lineTo(32, -47); ctx.moveTo(32, -47); ctx.lineTo(37, -61); ctx.lineTo(40, -44); ctx.fill();
  ctx.fillRect(34, -40, 16, 10);
  ctx.beginPath(); ctx.moveTo(34, -30); ctx.lineTo(48, -30); ctx.lineTo(42, -20); ctx.lineTo(36, -22); ctx.fill(); // beard
  ell(49, -39, 3, 3, '#333');
  ell(33, -42, 2.2, 2.2, '#fff');
  // tartan collar
  ctx.fillStyle = '#c8102e'; ctx.fillRect(18, -36, 6, 12);
  ctx.restore();
  if (squat) {
    ctx.save(); ctx.scale(o.dir, 1);
    ctx.font = `30px ${FONT}`; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.textAlign = 'center';
    ctx.strokeText('*strain*', 0, -78); ctx.fillText('*strain*', 0, -78);
    ctx.restore();
  }
}

function drawPlayer() {
  const p = G.p, t = G.t;
  const ph = p.phase;
  const s1 = Math.sin(ph);
  const dying = mode === 'dying' || mode === 'over';
  ctx.save();
  if (dying) {
    const k = Math.min(1, G.dyingT * 3);
    ctx.translate(0, -10 * k);
    ctx.rotate(k * 1.35 * (p.lane === 0 ? -1 : 1));
  }
  if (p.welly > 0) {
    ell(0, -65, 70, 85, `rgba(255,215,0,${0.22 + Math.sin(t * 14) * 0.08})`);
  }
  const riding = p.bike > 0 && !dying;
  if (p.grace > 0 && !riding && Math.floor(t * 12) % 2) ctx.globalAlpha *= 0.45; // blink while landing
  const bob = p.air || dying || riding ? 0 : Math.abs(Math.cos(ph)) * 5;
  ctx.translate(0, -bob);
  if (riding) {
    // rear wheel + mudguard seen from behind, rider sits up on the saddle
    ctx.fillStyle = '#151515'; rr(-6, -78, 12, 78, 6); ctx.fill();
    ctx.fillStyle = '#9e9e9e'; ctx.fillRect(-1.5, -70, 3, 62);
    ctx.fillStyle = '#e53935'; rr(-9, -86, 18, 16, 6); ctx.fill();
    ell(0, -80, 4, 3, '#ff8a80');
    ctx.translate(0, -34);
  }
  const welly = p.welly > 0;
  // legs
  const legY = -48;
  const lf = riding ? -8 - Math.max(0, s1) * 14 : p.air ? -16 : -Math.max(0, s1) * 22;
  const rf = riding ? -8 - Math.max(0, -s1) * 14 : p.air ? -6 : -Math.max(0, -s1) * 22;
  for (const [lx, fy] of [[-10, lf], [10, rf]]) {
    ctx.fillStyle = '#f1c7a5';
    ctx.fillRect(lx - 6, legY, 12, fy - 18 - legY);
    ctx.fillStyle = welly ? '#ffd400' : '#efe6d2';
    ctx.fillRect(lx - 7, fy - (welly ? 32 : 24), 14, welly ? 26 : 18);
    if (!welly) { ctx.fillStyle = '#c8102e'; ctx.fillRect(lx - 7, fy - 24, 14, 3); }
    ctx.fillStyle = welly ? '#e0b000' : '#2b1d14';
    rr(lx - 8, fy - 8, 16, 9, 3); ctx.fill();
  }
  // kilt
  ctx.save();
  ctx.beginPath();
  const sway = Math.sin(ph) * 3;
  ctx.moveTo(-20, -80); ctx.lineTo(20, -80); ctx.lineTo(25 + sway, -45); ctx.lineTo(-25 + sway, -45); ctx.closePath();
  ctx.fillStyle = '#b51f2b'; ctx.fill(); ctx.clip();
  ctx.fillStyle = 'rgba(20,60,30,0.75)';
  for (let x = -28; x < 30; x += 12) ctx.fillRect(x + sway * 0.5, -82, 5, 40);
  ctx.fillStyle = 'rgba(20,40,80,0.55)';
  ctx.fillRect(-30, -74, 60, 5); ctx.fillRect(-30, -60, 60, 5);
  ctx.fillStyle = 'rgba(255,220,80,0.6)';
  ctx.fillRect(-30, -66, 60, 1.5);
  for (let x = -26; x < 30; x += 12) ctx.fillRect(x + 8 + sway * 0.5, -82, 1.5, 40);
  ctx.restore();
  // torso
  ctx.fillStyle = '#23365e';
  rr(-19, -112, 38, 36, 9); ctx.fill();
  fitText('DODGER', 0, -94, 30, 12, '#ffd84d');
  // arms
  ctx.strokeStyle = '#23365e'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  if (riding) {
    ctx.beginPath(); ctx.moveTo(-17, -106); ctx.lineTo(-32, -92); ctx.moveTo(17, -106); ctx.lineTo(32, -92); ctx.stroke();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-40, -94); ctx.lineTo(40, -94); ctx.stroke();
    ell(-32, -92, 5.5, 5.5, '#f1c7a5'); ell(32, -92, 5.5, 5.5, '#f1c7a5');
    ell(26, -98, 4, 3, '#ffd400'); // bell
  } else {
    const swing = p.air ? -14 : s1 * 12;
    ctx.beginPath(); ctx.moveTo(-17, -106); ctx.lineTo(-26, -84 - swing); ctx.moveTo(17, -106); ctx.lineTo(26, -84 + swing); ctx.stroke();
    ell(-26, -82 - swing, 5.5, 5.5, '#f1c7a5'); ell(26, -82 + swing, 5.5, 5.5, '#f1c7a5');
  }
  // head (from behind)
  ell(-12, -121, 3.5, 5, '#f1c7a5'); ell(12, -121, 3.5, 5, '#f1c7a5');
  ell(0, -122, 12.5, 13, '#c4561d');
  ell(-4, -126, 4, 6, 'rgba(255,255,255,0.15)');
  // tam o' shanter
  ell(1, -134, 18, 6.5, '#1d3f8a');
  ctx.fillStyle = '#fff'; ctx.fillRect(-12, -131, 24, 3);
  ctx.fillStyle = '#c8102e'; for (let i = -12; i < 12; i += 6) ctx.fillRect(i, -131, 3, 3);
  ell(3, -141, 5.5 + Math.sin(ph * 2) * 0.6, 5.5, '#d61f26');
  ctx.restore();
}

function drawLamp(s) {
  ctx.fillStyle = '#1f3d2b';
  ctx.fillRect(-8, -40, 16, 40);
  ctx.fillRect(-4, -330, 8, 300);
  ctx.fillRect(-4, -330, 50, 6);
  ctx.beginPath(); ctx.moveTo(32, -324); ctx.lineTo(56, -324); ctx.lineTo(52, -300); ctx.lineTo(36, -300); ctx.fill();
  ell(44, -300, 10, 4, G.rain > 0.3 ? '#fff8c0' : '#fffbe6');
  if (s.sign === 'fine') {
    ctx.fillStyle = '#fff'; rr(-36, -190, 72, 64, 5); ctx.fill();
    ctx.strokeStyle = '#c8102e'; ctx.lineWidth = 3; rr(-36, -190, 72, 64, 5); ctx.stroke();
    ctx.fillStyle = '#c8102e'; ctx.fillRect(-36, -190, 72, 18);
    fitText('DOG FOULING', 0, -180, 64, 14, '#fff');
    fitText('£80 FINE', 0, -157, 62, 20, '#c8102e');
    fitText('(ha!)', 0, -137, 60, 11, '#555');
  } else if (s.sign) {
    ctx.fillStyle = '#fff'; rr(-58, -200, 116, 30, 4); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3; rr(-55, -197, 110, 24, 3); ctx.stroke();
    fitText(s.sign, 0, -184, 100, 18, '#111');
  }
}

function drawTree(s) {
  const k = s.s;
  ctx.scale(k, k);
  ctx.fillStyle = '#efeee8';
  ctx.fillRect(-7, -260, 14, 260);
  ctx.fillStyle = '#2b2b2b';
  for (let i = 0; i < 8; i++) ctx.fillRect(-7 + ((i * 5 + s.seed * 3) % 9), -30 - i * 28, 6 + (i % 3) * 2, 3);
  const g1 = mix('#77ad46', '#5b7d45', G.rain), g2 = mix('#5f9a3a', '#4a6a3c', G.rain);
  ell(0, -260, 62, 58, g2);
  ell(-30, -230, 40, 36, g1);
  ell(28, -240, 42, 40, g1);
  ell(4, -300, 40, 36, g1);
}

function drawWelcome() {
  ctx.fillStyle = '#5a3a1f'; ctx.fillRect(-95, -120, 10, 120); ctx.fillRect(85, -120, 10, 120);
  ctx.fillStyle = '#20553a'; rr(-120, -250, 240, 140, 10); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; rr(-112, -242, 224, 124, 8); ctx.stroke();
  fitText('Fàilte · Welcome to', 0, -224, 200, 16, '#fff');
  fitText('ABERFELDY', 0, -195, 210, 40, '#fff');
  fitText('Obar Pheallaidh', 0, -168, 200, 16, '#cfe8d8');
  ctx.fillStyle = '#c8102e'; ctx.fillRect(-112, -152, 224, 30);
  fitText('PLEASE CLEAN UP AFTER YOUR DOG', 0, -136, 210, 14, '#fff');
}

function drawBin(s) {
  ctx.fillStyle = '#666'; ctx.fillRect(-4, -90, 8, 90);
  ctx.fillStyle = '#c8102e'; rr(-24, -150, 48, 62, 6); ctx.fill();
  ctx.fillStyle = '#9a0b22'; ctx.fillRect(-24, -150, 48, 9);
  fitText('DOG', 0, -125, 40, 15, '#fff');
  fitText('WASTE', 0, -108, 40, 12, '#fff');
  fitText('(empty)', 0, -96, 40, 9, '#ffd0d0');
  flies(3, 0, -160, 30, 12, s.seed, 2.5);
}

function drawTractor() {
  const t = G.t;
  ell(0, 0, 90, 12, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = '#1a1a1a'; rr(-90, -95, 38, 95, 10); ctx.fill(); rr(52, -95, 38, 95, 10); ctx.fill();
  ctx.fillStyle = '#333'; for (let y = -88; y < 0; y += 12) { ctx.fillRect(-90, y, 38, 3); ctx.fillRect(52, y, 38, 3); }
  ctx.fillStyle = '#c62828'; rr(-55, -110, 110, 70, 6); ctx.fill();
  ctx.fillStyle = '#b71c1c'; ctx.fillRect(-60, -200, 120, 12); ctx.fillRect(-56, -190, 8, 80); ctx.fillRect(48, -190, 8, 80);
  ctx.fillStyle = 'rgba(160,200,230,0.6)'; ctx.fillRect(-48, -188, 96, 74);
  ell(0, -140, 13, 14, '#e0b090'); ell(0, -152, 15, 6, '#3d5a2a');
  ctx.fillStyle = '#ffeb3b'; ctx.fillRect(-50, -60, 14, 9); ctx.fillRect(36, -60, 14, 9);
  ctx.fillStyle = '#ff7043'; ell(0, -205, 6 + Math.sin(t * 10) * 1, 5, '#ff9800');
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.9 + i / 3) % 1;
    ell(40 + ph * 20, -210 - ph * 80, 10 + ph * 20, 10 + ph * 20, `rgba(90,90,90,${0.5 * (1 - ph)})`);
  }
  ctx.fillStyle = '#fff'; rr(-28, -54, 56, 16, 3); ctx.fill();
  fitText('PH15 2', 0, -45, 50, 12, '#111');
}

function drawBridge() {
  const t = G.t;
  // River Tay
  const wg = ctx.createLinearGradient(0, -60, 0, 0);
  wg.addColorStop(0, '#3d6f8f'); wg.addColorStop(1, '#2a5470');
  ctx.fillStyle = wg; ctx.fillRect(-520, -60, 1040, 60);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) { const x = -480 + ((i * 120 + t * 40) % 960); ctx.beginPath(); ctx.moveTo(x, -20 - (i % 3) * 12); ctx.lineTo(x + 40, -20 - (i % 3) * 12); ctx.stroke(); }
  // bridge body
  const stone = '#8f8a84';
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(-470, -40); ctx.lineTo(-470, -150); ctx.quadraticCurveTo(0, -270, 470, -150); ctx.lineTo(470, -40); ctx.closePath(); ctx.fill();
  // parapet
  ctx.strokeStyle = '#6f6a64'; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(-470, -156); ctx.quadraticCurveTo(0, -276, 470, -156); ctx.stroke();
  // arches
  ctx.fillStyle = '#25445a';
  const arches = [[-330, 70, 70], [-170, 85, 100], [0, 105, 150], [170, 85, 100], [330, 70, 70]];
  for (const [ax, r, hh] of arches) {
    ctx.beginPath(); ctx.moveTo(ax - r, -40); ctx.lineTo(ax - r, -40 - hh + r); ctx.arc(ax, -40 - hh + r, r, Math.PI, 0); ctx.lineTo(ax + r, -40); ctx.fill();
  }
  // stone courses
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
  for (let y = -60; y > -200; y -= 22) { ctx.beginPath(); ctx.moveTo(-470, y); ctx.lineTo(470, y); ctx.stroke(); }
  // four obelisks on the hump
  ctx.fillStyle = '#7d7871';
  for (const ox of [-75, -28, 28, 75]) {
    const base = -258 + Math.abs(ox) * 0.25;
    ctx.fillRect(ox - 12, base - 14, 24, 14);
    ctx.beginPath(); ctx.moveTo(ox - 9, base - 14); ctx.lineTo(ox, base - 110); ctx.lineTo(ox + 9, base - 14); ctx.fill();
  }
  brownSign("WADE'S BRIDGE · 1733", 0, -390, 340, 52);
}

function drawBlackWatch() {
  ell(0, 0, 110, 14, 'rgba(0,0,0,0.25)');
  // cairn
  const stones = ['#8c857a', '#7a746a', '#9a9387', '#6f695f'];
  for (let i = 0; i < 12; i++) {
    const y = -i * 28, w = 100 - i * 4.5;
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = stones[(i + j) % 4];
      rr(-w + j * (w / 2), y - 30, w / 2 + 2, 30, 6); ctx.fill();
    }
  }
  // the soldier (stone statue) in feather bonnet
  const sy = -336, c = '#a7a296', d = '#8e897d';
  ctx.fillStyle = d; ctx.fillRect(-18, sy - 40, 14, 40); ctx.fillRect(4, sy - 40, 14, 40);
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-26, sy - 80); ctx.lineTo(26, sy - 80); ctx.lineTo(32, sy - 38); ctx.lineTo(-32, sy - 38); ctx.fill();
  ctx.fillStyle = d; ctx.fillRect(-12, sy - 52, 24, 16);
  ctx.fillStyle = c; rr(-24, sy - 130, 48, 54, 8); ctx.fill();
  ell(0, sy - 145, 14, 15, c);
  ctx.fillStyle = d; rr(-18, sy - 196, 36, 48, 14); ctx.fill();
  ctx.strokeStyle = d; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(30, sy - 40); ctx.lineTo(42, sy - 160); ctx.stroke();
  brownSign('BLACK WATCH MEMORIAL', 0, -560, 300, 48);
}

function drawDistillery() {
  ell(0, 0, 340, 16, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = '#cfc6b4'; ctx.fillRect(-330, -230, 520, 230);
  ctx.fillStyle = '#4b5059';
  ctx.beginPath(); ctx.moveTo(-345, -230); ctx.lineTo(-70, -320); ctx.lineTo(205, -230); ctx.fill();
  // pagoda kiln
  ctx.fillStyle = '#d9d1c0'; ctx.fillRect(190, -330, 140, 330);
  ctx.fillStyle = '#3e434b';
  ctx.beginPath(); ctx.moveTo(170, -330); ctx.quadraticCurveTo(230, -360, 260, -440); ctx.quadraticCurveTo(290, -360, 350, -330); ctx.fill();
  ctx.fillRect(240, -470, 40, 34);
  ctx.beginPath(); ctx.moveTo(228, -470); ctx.lineTo(260, -500); ctx.lineTo(292, -470); ctx.fill();
  // windows & door
  ctx.fillStyle = '#3a4d63';
  for (let x = -300; x < 160; x += 70) ctx.fillRect(x, -190, 34, 50);
  ctx.fillStyle = '#5a3a1f'; rr(-60, -120, 80, 120, 30); ctx.fill();
  // sign board
  ctx.fillStyle = '#111'; ctx.fillRect(-300, -100, 220, 50);
  fitText('ABERFELDY', -190, -84, 200, 22, '#d6b25e');
  fitText('DISTILLERY · EST. 1896', -190, -62, 200, 13, '#d6b25e');
  // casks
  for (const x of [80, 130, 105]) {
    const y = x === 105 ? -86 : -40;
    ell(x, y + 20, 26, 21, '#7a4a22');
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 20, 26, 21, 0, 0, TAU); ctx.stroke();
    ell(x, y + 20, 9, 7, '#5a3418');
  }
}

function drawBirks(s) {
  const t = G.t;
  ell(0, 0, 230, 14, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = '#6e6458';
  ctx.beginPath(); ctx.moveTo(-230, 0); ctx.lineTo(-210, -300); ctx.lineTo(-140, -340); ctx.lineTo(-50, -300); ctx.lineTo(-40, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(50, -310); ctx.lineTo(150, -350); ctx.lineTo(220, -290); ctx.lineTo(235, 0); ctx.fill();
  // falls
  const wg = ctx.createLinearGradient(0, -300, 0, 0);
  wg.addColorStop(0, '#d8f1ff'); wg.addColorStop(1, '#9fd2ee');
  ctx.fillStyle = wg; ctx.fillRect(-46, -300, 92, 300);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
  for (let i = 0; i < 7; i++) {
    const x = -38 + i * 12.5, off = (t * 260 + i * 47) % 300;
    ctx.beginPath(); ctx.moveTo(x, -300 + off); ctx.lineTo(x, -300 + off + 50); ctx.stroke();
  }
  ell(0, -8, 110, 22, '#bfe5f7');
  ell(0, -8, 80, 12, '#ffffff');
  // birches
  for (const [x, y, k] of [[-180, -330, 1], [-90, -310, 0.8], [110, -340, 1.1], [190, -300, 0.9]]) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = '#efeee8'; ctx.fillRect(-5, -110, 10, 110);
    ell(0, -120, 45, 40, '#79ad48'); ell(-20, -100, 26, 24, '#5f9a3a'); ell(22, -140, 28, 26, '#8cc157');
    ctx.restore();
  }
  brownSign("THE BIRKS O' ABERFELDY", 0, -500, 340, 50);
  ctx.font = `italic 22px Georgia, serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4;
  ctx.strokeText('"Bonie lassie, will ye go…" — Burns', 0, -425);
  ctx.fillText('"Bonie lassie, will ye go…" — Burns', 0, -425);
}

function drawCow(x, k, t, seed) {
  ctx.save(); ctx.translate(x, 0); ctx.scale(k, k);
  ell(0, 0, 80, 10, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = '#9c4a1a';
  for (const lx of [-50, -30, 30, 50]) ctx.fillRect(lx - 7, -55, 14, 55);
  ell(0, -85, 75, 42, '#b8611f');
  ctx.strokeStyle = '#d67a2c'; ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(-65 + i * 11, -110 + (i % 2) * 6); ctx.lineTo(-62 + i * 11 + Math.sin(t * 2 + i) * 2, -50); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-74, -90); ctx.quadraticCurveTo(-95, -70 + Math.sin(t * 3 + seed) * 10, -88, -45); ctx.stroke();
  ell(78, -95, 30, 28, '#b8611f');
  ctx.strokeStyle = '#efe3c2'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(62, -112); ctx.quadraticCurveTo(30, -125, 40, -158); ctx.moveTo(94, -112); ctx.quadraticCurveTo(126, -125, 116, -158); ctx.stroke();
  ctx.fillStyle = '#d67a2c';
  ctx.beginPath(); ctx.moveTo(52, -112); for (let i = 0; i <= 8; i++) ctx.lineTo(52 + i * 7, -88 + (i % 2) * 10); ctx.lineTo(104, -112); ctx.fill();
  ell(80, -74, 18, 12, '#6d3a1a');
  ctx.restore();
}
function drawCows(s) {
  drawCow(-90, 1, G.t, s.seed);
  drawCow(120, 0.85, G.t + 1, s.seed + 2);
  brownSign('HIGHLAND COOS (UNIMPRESSED)', 0, -230, 340, 44);
}

function drawPiper() {
  const t = G.t;
  ell(0, 0, 40, 8, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = '#f1c7a5'; ctx.fillRect(-14, -50, 10, 30); ctx.fillRect(4, -50, 10, 30);
  ctx.fillStyle = '#efe6d2'; ctx.fillRect(-15, -26, 12, 20); ctx.fillRect(3, -26, 12, 20);
  ctx.fillStyle = '#111'; ctx.fillRect(-16, -8, 14, 8); ctx.fillRect(2, -8, 14, 8);
  ctx.fillStyle = '#1b3b6f'; ctx.beginPath(); ctx.moveTo(-22, -100); ctx.lineTo(22, -100); ctx.lineTo(26, -48); ctx.lineTo(-26, -48); ctx.fill();
  ctx.fillStyle = 'rgba(30,100,50,0.8)'; for (let x = -24; x < 26; x += 10) ctx.fillRect(x, -100, 4, 52);
  ctx.fillStyle = '#fff'; ell(0, -60, 8, 10, '#e8e0d0');
  ctx.fillStyle = '#111'; rr(-22, -150, 44, 56, 8); ctx.fill();
  ell(0, -164, 13, 14, '#f1c7a5');
  ell(0, -164 + Math.sin(t * 12) * 1, 4, 3 + Math.abs(Math.sin(t * 12)) * 2, '#d0806a');
  ctx.fillStyle = '#111'; rr(-16, -210, 32, 40, 12); ctx.fill();
  // bag + drones
  ell(24, -128, 18 + Math.sin(t * 6) * 2, 14, '#b51f2b');
  ctx.fillStyle = '#2a1a0a';
  for (const [dx, h] of [[18, 90], [28, 70], [38, 60]]) ctx.fillRect(dx, -128 - h, 5, h);
  ctx.fillRect(-4, -126, 5, 50);
  // notes
  ctx.fillStyle = '#fff'; ctx.font = `28px ${FONT}`; ctx.textAlign = 'center';
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.7 + i / 3) % 1;
    ctx.globalAlpha = (1 - ph) * 0.9;
    ctx.fillText(i % 2 ? '♪' : '♫', 40 + ph * 50 + Math.sin(ph * 10) * 8, -220 - ph * 90);
  }
  ctx.globalAlpha = 1;
}

function drawCastle() {
  ell(0, 0, 250, 14, 'rgba(0,0,0,0.25)');
  const harl = '#ecebe4', slate = '#4b5059';
  ctx.fillStyle = harl; ctx.fillRect(-180, -260, 360, 260);
  ctx.fillStyle = slate; ctx.beginPath(); ctx.moveTo(-190, -260); ctx.lineTo(-120, -360); ctx.lineTo(120, -360); ctx.lineTo(190, -260); ctx.fill();
  // crow-stepped gables
  ctx.fillStyle = harl;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) ctx.fillRect(sx * (180 - i * 14) - (sx > 0 ? 14 : 0), -270 - i * 20, 14, 20);
  }
  for (const tx of [-180, 180]) {
    ctx.fillStyle = harl; ctx.fillRect(tx - 30, -330, 60, 140);
    ctx.fillStyle = slate; ctx.beginPath(); ctx.moveTo(tx - 36, -330); ctx.lineTo(tx, -410); ctx.lineTo(tx + 36, -330); ctx.fill();
  }
  ctx.fillStyle = '#3a4d63';
  for (const [x, y] of [[-100, -200], [-30, -200], [40, -200], [110, -200], [-100, -120], [110, -120], [-180, -280], [180, -280]]) ctx.fillRect(x - 10, y, 20, 32);
  ctx.fillStyle = '#5a3a1f'; rr(-20, -90, 40, 90, 18); ctx.fill();
  brownSign('CASTLE MENZIES', 0, -450, 260, 46);
}

function drawGolf(s) {
  const t = G.t;
  ell(0, 0, 150, 12, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = '#74b84a'; ell(0, -6, 150, 16, '#74b84a');
  ctx.fillStyle = '#333'; ctx.fillRect(40, -150, 4, 150);
  ctx.fillStyle = '#ffd400';
  ctx.beginPath(); ctx.moveTo(44, -150); ctx.lineTo(44 + 50, -138 + Math.sin(t * 6) * 4); ctx.lineTo(44, -122); ctx.fill();
  ell(40, -2, 10, 4, '#222');
  // golfer staring at his shoe
  ell(-70, -150, 13, 14, '#f1c7a5');
  ctx.fillStyle = '#e45b9c'; rr(-88, -136, 36, 50, 6); ctx.fill();
  ctx.fillStyle = '#e7d9b0'; ctx.fillRect(-86, -88, 14, 70); ctx.fillRect(-68, -88, 14, 70);
  ctx.fillStyle = '#111'; ctx.fillRect(-88, -20, 18, 10); ctx.fillRect(-56, -40, 18, 10);
  ell(-48, -32, 10, 5, '#6b3d1a');
  ctx.fillStyle = '#fff'; ctx.font = `30px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('?!', -40, -180 - Math.abs(Math.sin(t * 4)) * 8);
  brownSign('ABERFELDY GOLF CLUB', 0, -240, 280, 44);
}

// Hanging poo bags: a kerbside tree with a branch reaching over the pavement.
const BAG_TREE_X = KERB_X - 0.3;
function bagTree(reach) {
  const t = G.t;
  ctx.fillStyle = '#4a3423';
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-10, -330); ctx.lineTo(10, -330); ctx.lineTo(16, 0); ctx.fill();
  ctx.strokeStyle = '#4a3423'; ctx.lineCap = 'round';
  ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(0, -300); ctx.quadraticCurveTo(reach * 0.5, -360, reach, -372 + Math.sin(t * 1.3) * 2); ctx.stroke();
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(reach * 0.55, -350); ctx.lineTo(reach * 0.75, -420); ctx.stroke();
  const g1 = mix('#4f8a35', '#3f6a35', G.rain), g2 = mix('#6aa944', '#557a45', G.rain);
  for (const [x, y, r] of [[-20, -360, 60], [40, -410, 55], [reach * 0.45, -400, 58], [reach * 0.8, -420, 50], [reach, -390, 46]]) {
    ell(x, y, r, r * 0.8, g1); ell(x - r * 0.3, y - r * 0.25, r * 0.6, r * 0.5, g2);
  }
  // nailed-on sign
  ctx.fillStyle = '#fff'; rr(-60, -210, 120, 56, 5); ctx.fill();
  ctx.strokeStyle = '#c8102e'; ctx.lineWidth = 4; rr(-56, -206, 112, 48, 4); ctx.stroke();
  fitText('THE POO', 0, -192, 100, 20, '#c8102e');
  fitText('BAG TREE', 0, -170, 100, 20, '#c8102e');
}
function pooBag(swing) {
  ctx.save();
  ctx.rotate(swing);
  ctx.scale(1.3, 1.3);
  ctx.fillStyle = '#1d261d'; ctx.strokeStyle = '#0b0f0b'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.lineTo(-14, 8); ctx.quadraticCurveTo(-34, 30, -26, 52); ctx.quadraticCurveTo(0, 66, 26, 52);
  ctx.quadraticCurveTo(34, 30, 14, 8); ctx.lineTo(6, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ell(-12, 28, 5, 10, 'rgba(255,255,255,0.2)');
  ell(6, 44, 10, 6, 'rgba(110,62,26,0.6)');
  flies(2, 0, 30, 34, 16, swing * 10, 2.6);
  ctx.restore();
}
function drawHang(o) {
  const t = G.t;
  const reach = (1.55 - BAG_TREE_X) * 100;
  bagTree(reach);
  o.bags.forEach((b, i) => {
    if (b.dead) return;
    const lx = (b.x - BAG_TREE_X) * 100;
    const u = lx / reach; // the branch is a quadratic curve with x linear in u
    const branchY = (1 - u) ** 2 * -300 + 2 * u * (1 - u) * -360 + u * u * -372;
    const knotY = -(HANG_LOW + 0.62) * 100;
    const sway = Math.sin(t * 2.2 + i * 1.3 + o.seed) * 0.08;
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(lx, branchY); ctx.lineTo(lx + Math.sin(sway) * 60, knotY); ctx.stroke();
    ctx.save(); ctx.translate(lx + Math.sin(sway) * 60, knotY); pooBag(sway); ctx.restore();
  });
}
function drawSwing(o) {
  if (o.dead) return;
  const sw = swingPos(o);
  const reach = (1.55 - BAG_TREE_X) * 100;
  bagTree(reach);
  const ax = (0 - BAG_TREE_X) * 100, ay = -SWING.ay * 100;
  const kx = (sw.x - BAG_TREE_X) * 100, ky = -(sw.y + 0.3) * 100;
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.save(); ctx.translate(kx, ky); pooBag(-sw.th); ctx.restore();
  // motion lines
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
  const dir = Math.cos(G.t * o.w + o.ph) > 0 ? -1 : 1;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(kx + dir * (34 + i * 10), ky + 20 + i * 12); ctx.lineTo(kx + dir * (60 + i * 14), ky + 20 + i * 12); ctx.stroke(); }
}

function drawCrannog() {
  const t = G.t;
  ctx.fillStyle = '#3d6f8f'; ctx.fillRect(-340, -70, 680, 70);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const x = -320 + ((i * 130 + t * 30) % 640); ctx.beginPath(); ctx.moveTo(x, -30 - (i % 2) * 18); ctx.lineTo(x + 40, -30 - (i % 2) * 18); ctx.stroke(); }
  ctx.fillStyle = '#5a4030';
  for (let x = -110; x <= 110; x += 22) ctx.fillRect(x - 4, -110, 8, 100);
  ctx.fillRect(-140, -118, 280, 14);
  ctx.fillRect(140, -112, 200, 10); // walkway to shore
  ctx.fillStyle = '#8a6a48'; ctx.fillRect(-100, -200, 200, 84);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
  for (let x = -90; x < 100; x += 18) { ctx.beginPath(); ctx.moveTo(x, -200); ctx.lineTo(x, -118); ctx.stroke(); }
  ctx.fillStyle = '#c9a85a';
  ctx.beginPath(); ctx.moveTo(-130, -196); ctx.lineTo(0, -330); ctx.lineTo(130, -196); ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,30,0.5)';
  for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 24, -196); ctx.lineTo(0, -326); ctx.stroke(); }
  ctx.fillStyle = '#2b1d14'; rr(-18, -170, 36, 54, 14); ctx.fill();
  for (let i = 0; i < 3; i++) { const ph = (t * 0.4 + i / 3) % 1; ell(10 + ph * 30, -340 - ph * 70, 10 + ph * 18, 8 + ph * 14, `rgba(200,200,200,${0.5 * (1 - ph)})`); }
  brownSign('SCOTTISH CRANNOG CENTRE', 0, -380, 320, 48);
}

function drawTaymouth() {
  ell(0, 0, 330, 16, 'rgba(0,0,0,0.25)');
  const stone = '#a6a29a', dark = '#8c887f';
  const crenel = (x0, x1, y) => { ctx.fillStyle = stone; for (let x = x0; x < x1; x += 20) ctx.fillRect(x, y - 14, 12, 14); };
  ctx.fillStyle = stone; ctx.fillRect(-300, -230, 600, 230);
  crenel(-300, 300, -230);
  ctx.fillStyle = dark; ctx.fillRect(-90, -400, 180, 400);
  crenel(-90, 90, -400);
  for (const tx of [-300, 300, -90, 90]) {
    ctx.fillStyle = dark; ctx.fillRect(tx - 18, (Math.abs(tx) > 100 ? -280 : -450), 36, Math.abs(tx) > 100 ? 280 : 450);
    ctx.beginPath(); ctx.moveTo(tx - 24, Math.abs(tx) > 100 ? -280 : -450); ctx.lineTo(tx, Math.abs(tx) > 100 ? -330 : -500); ctx.lineTo(tx + 24, Math.abs(tx) > 100 ? -280 : -450); ctx.fill();
  }
  ctx.fillStyle = '#3a4d63';
  for (let x = -260; x <= 260; x += 52) for (const y of [-190, -110]) if (Math.abs(x) > 100) { ctx.beginPath(); ctx.moveTo(x - 12, y + 40); ctx.lineTo(x - 12, y); ctx.arc(x, y, 12, Math.PI, 0); ctx.lineTo(x + 12, y + 40); ctx.fill(); }
  for (const y of [-350, -270, -190]) for (const x of [-40, 0, 40]) { ctx.beginPath(); ctx.moveTo(x - 10, y + 40); ctx.lineTo(x - 10, y); ctx.arc(x, y, 10, Math.PI, 0); ctx.lineTo(x + 10, y + 40); ctx.fill(); }
  ctx.fillStyle = '#2b1d14'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-30, -70); ctx.arc(0, -70, 30, Math.PI, 0); ctx.lineTo(30, 0); ctx.fill();
  ctx.fillStyle = '#c8102e'; ctx.fillRect(-2, -560, 4, 60);
  ctx.beginPath(); ctx.moveTo(2, -560); ctx.lineTo(50, -548 + Math.sin(G.t * 5) * 4); ctx.lineTo(2, -536); ctx.fill();
  brownSign('TAYMOUTH CASTLE', 0, -600, 300, 48);
}

function drawDull() {
  // the real village sign, more or less
  ctx.fillStyle = '#555'; ctx.fillRect(-90, -150, 10, 150); ctx.fillRect(80, -150, 10, 150);
  ctx.fillStyle = '#fff'; rr(-130, -330, 260, 190, 10); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 6; rr(-122, -322, 244, 174, 8); ctx.stroke();
  fitText('DULL', 0, -275, 220, 74, '#111');
  ctx.fillStyle = '#111'; ctx.fillRect(-100, -236, 200, 3);
  fitText('Paired with', 0, -214, 200, 22, '#333');
  fitText('BORING · OREGON', 0, -184, 220, 28, '#1d3f8a');
  fitText('(and Bland, Australia)', 0, -160, 200, 16, '#666');
}

function drawYew() {
  ell(0, 0, 200, 14, 'rgba(0,0,0,0.25)');
  // the walled enclosure
  ctx.fillStyle = '#8f8a80'; ctx.fillRect(-190, -50, 380, 50);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2;
  for (let x = -190; x < 190; x += 30) { ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x, 0); ctx.stroke(); }
  ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
  for (let x = -180; x <= 180; x += 20) { ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x, -90); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-180, -88); ctx.lineTo(180, -88); ctx.stroke();
  // gnarled trunk + huge dark canopy
  ctx.fillStyle = '#5a3a28';
  ctx.beginPath(); ctx.moveTo(-70, -50); ctx.quadraticCurveTo(-40, -150, -80, -230); ctx.lineTo(-20, -200); ctx.lineTo(10, -260); ctx.lineTo(40, -190); ctx.lineTo(90, -230); ctx.quadraticCurveTo(50, -140, 70, -50); ctx.fill();
  for (const [x, y, r] of [[-120, -260, 90], [0, -320, 110], [120, -260, 90], [-60, -220, 70], [70, -210, 70], [0, -400, 70]]) {
    ell(x, y, r, r * 0.75, '#2f4a2a'); ell(x - r * 0.2, y - r * 0.2, r * 0.6, r * 0.45, '#3d5e34');
  }
  brownSign('FORTINGALL YEW', 0, -480, 280, 46);
}

function drawFootbridge() {
  const t = G.t;
  ctx.fillStyle = '#3d6f8f'; ctx.fillRect(-520, -50, 1040, 50);
  ctx.fillStyle = '#74b84a'; ell(-380, -50, 160, 20, '#74b84a'); ell(380, -50, 160, 20, '#74b84a');
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const x = -300 + ((i * 110 + t * 40) % 600); ctx.beginPath(); ctx.moveTo(x, -22); ctx.lineTo(x + 34, -22); ctx.stroke(); }
  // deck
  ctx.fillStyle = '#f2f2ee'; ctx.fillRect(-500, -150, 1000, 16);
  ctx.fillStyle = '#c9c9c2'; ctx.fillRect(-500, -134, 1000, 6);
  // A-frame pylons and fanned cables
  for (const px of [-250, 250]) {
    ctx.strokeStyle = '#f2f2ee'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(px - 40, -40); ctx.lineTo(px, -430); ctx.lineTo(px + 40, -40); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5;
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo(px, -420 + i * 8); ctx.lineTo(px - i * 40, -150); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, -420 + i * 8); ctx.lineTo(px + i * 40, -150); ctx.stroke();
    }
  }
  // golfer crossing
  const gx = ((t * 40) % 800) - 400;
  ell(gx, -205, 9, 10, '#f1c7a5'); ctx.fillStyle = '#e45b9c'; ctx.fillRect(gx - 9, -195, 18, 26); ctx.fillStyle = '#333'; ctx.fillRect(gx - 7, -169, 14, 18);
  brownSign('ABERFELDY FOOTBRIDGE · 1992', 0, -470, 380, 48);
}

function drawRafting() {
  const t = G.t;
  const wg = ctx.createLinearGradient(0, -120, 0, 0);
  wg.addColorStop(0, '#4a86a8'); wg.addColorStop(1, '#2a5470');
  ctx.fillStyle = wg; ctx.fillRect(-330, -120, 660, 120);
  ctx.fillStyle = '#6e6458'; ell(-200, -40, 50, 24, '#6e6458'); ell(170, -70, 40, 20, '#6e6458');
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4;
  for (let i = 0; i < 10; i++) {
    const x = -300 + ((i * 70 + t * 120) % 600), y = -20 - (i % 4) * 24;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 15, y - 12, x + 30, y); ctx.stroke();
  }
  // raft bouncing down the rapids
  const bob = Math.sin(t * 6) * 8, tilt = Math.sin(t * 4) * 0.12;
  ctx.save(); ctx.translate(0, -70 + bob); ctx.rotate(tilt);
  ctx.fillStyle = '#f5c400'; rr(-110, -24, 220, 44, 22); ctx.fill();
  ctx.strokeStyle = '#b08a00'; ctx.lineWidth = 4; rr(-110, -24, 220, 44, 22); ctx.stroke();
  const helmets = ['#c8102e', '#1565c0', '#2e7d32', '#ff9800'];
  for (let i = 0; i < 4; i++) {
    const x = -75 + i * 50;
    ctx.fillStyle = '#ff5722'; ctx.fillRect(x - 12, -60, 24, 36);
    ell(x, -70, 12, 12, '#f1c7a5'); ell(x, -76, 13, 8, helmets[i]);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 4;
    const a = Math.sin(t * 6 + i) * 0.6;
    ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x + Math.sin(a) * 50, -50 + Math.cos(a) * 60); ctx.stroke();
  }
  ctx.restore();
  ctx.font = `34px ${FONT}`; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.textAlign = 'center';
  ctx.strokeText('WHEEEE!', 60, -190 + bob); ctx.fillText('WHEEEE!', 60, -190 + bob);
  brownSign('GRANDTULLY RAPIDS', 0, -260, 300, 46);
}

// Big brown tourist sign on a tall post at the far side of the road, overhanging it.
function drawLandmarkSign(s) {
  const [name, sub] = LANDMARK_INFO[s.lm];
  ctx.scale(1.3, 1.3);
  // board reaches from the far verge to the kerb, well above head height
  const x0 = -30, x1 = (KERB_X - 0.35 - LMSIGN_X) * 100, top = -470, bot = -305;
  ctx.fillStyle = '#5b5b5b'; ctx.fillRect(-9, -480, 18, 480);
  ctx.fillRect(x1 - 30, -480, 14, 30);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(x0 + 6, top + 6, x1 - x0, bot - top, 10); ctx.fill();
  ctx.fillStyle = '#6b3a1f'; rr(x0, top, x1 - x0, bot - top, 10); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; rr(x0 + 7, top + 7, x1 - x0 - 14, bot - top - 14, 6); ctx.stroke();
  const cxs = (x0 + x1) / 2;
  fitText(name, cxs, top + 64, x1 - x0 - 36, 70, '#fff');
  fitText(sub, cxs, top + 125, x1 - x0 - 44, 30, '#ffe2bf');
}

function drawShopSign(shop) {
  ctx.strokeStyle = '#151515'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -96); ctx.lineTo(-195, -96); ctx.moveTo(0, -60); ctx.lineTo(-36, -96); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-180, -96); ctx.lineTo(-180, -86); ctx.moveTo(-34, -96); ctx.lineTo(-34, -86); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(-191, -82, 180, 86, 8); ctx.fill();
  ctx.fillStyle = shop.sign; rr(-195, -86, 180, 86, 8); ctx.fill();
  ctx.strokeStyle = shop.accent; ctx.lineWidth = 5; rr(-189, -80, 168, 74, 5); ctx.stroke();
  fitText(shop.name, -105, -52, 156, 36, shop.text);
  fitText(shop.sub, -105, -21, 152, 17, shop.text);
}

function drawShadow(x, z, rx, alpha) {
  const [sx, sy, s] = P(x, 0, z);
  if (z < NEAR_Z) return;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath(); ctx.ellipse(sx, sy, rx * s, rx * s * 0.28, 0, 0, TAU); ctx.fill();
}

function collectSprites() {
  const items = [];
  const add = (z, fn) => { if (z > NEAR_Z && z < FAR_Z) items.push({ z, fn }); };
  const D = G.dist;
  for (const b of G.blds) {
    const z = b.z0 - D + 0.8;
    if (z < b.z1 - D && z > 1.5) {
      add(z, () => sprite(WALL_X, 3.0, z, 2.2, () => {
        ctx.globalAlpha *= clamp((z - 1.5) / 3.5, 0, 1);
        drawShopSign(b.shop);
      }));
    }
  }
  for (const s of G.scen) {
    const z = s.wz - D;
    const big = LANDMARK_W[s.k] ? 1.6 : 1; // landmarks are drawn larger than life so they read
    const half = LANDMARK_W[s.k] ? LANDMARK_W[s.k] * big / 2 : s.k === 'lmsign' ? 3 : 2;
    const fns = {
      lamp: drawLamp, tree: drawTree, welcome: drawWelcome, bin: drawBin, tractor: drawTractor,
      bridge: drawBridge, blackwatch: drawBlackWatch, distillery: drawDistillery, birks: drawBirks,
      cows: drawCows, piper: drawPiper, castle: drawCastle, golf: drawGolf,
      lmsign: drawLandmarkSign, crannog: drawCrannog, taymouth: drawTaymouth, dull: drawDull, yew: drawYew, footbridge: drawFootbridge, rafting: drawRafting,
    };
    const fn = fns[s.k];
    if (fn) add(z, () => sprite(s.x, 0, z, half, () => { ctx.scale(big, big); fn(s); }));
  }
  for (const o of G.objs) {
    if (o.dead) continue;
    const z = o.wz - D;
    if (o.k === 'poo') add(z, () => sprite(o.x, 0, z, 1, () => drawPoo(o)));
    else if (o.k === 'bag') add(z, () => { drawShadow(o.x, z, 0.15, 0.15); sprite(o.x, o.y, z, 0.5, () => drawBag(o)); });
    else if (o.k === 'welly') add(z, () => { drawShadow(o.x, z, 0.3, 0.2); sprite(o.x, o.y, z, 0.6, () => drawWelly(o)); });
    else if (o.k === 'bike') add(z, () => { drawShadow(o.x, z, 0.35, 0.2); sprite(o.x, o.y, z, 0.8, () => drawBikePickup(o)); });
    else if (o.k === 'dog' && o.state !== 'wait') add(z, () => sprite(o.x, 0, z, 1, () => drawDog(o)));
    else if (o.k === 'hang') add(z + 0.05, () => sprite(BAG_TREE_X, 0, z, 4, () => drawHang(o)));
    else if (o.k === 'swing') add(z + 0.05, () => sprite(BAG_TREE_X, 0, z, 4, () => drawSwing(o)));
    else if (o.k === 'smear') add(z + o.len * 0.5, () => sprite(o.x, 0, z + o.len * 0.5, 1, () => { flies(3, 0, -30, 40, 12, o.seed, 3); stink(2, 50, -10, o.seed, 0.45); }));
  }
  add(0.001, () => {
    const p = G.p;
    drawShadow(p.x, 0, 0.32 * (1 - p.y * 0.25), 0.3 * (1 - p.y * 0.3));
    sprite(p.x, p.y, 0, 1, drawPlayer);
  });
  items.sort((a, b) => b.z - a.z);
  for (const it of items) it.fn();
}

// ---------------------------------------------------------------- render: overlays
function drawOverlays() {
  // speed streaks
  if (!G.attract && mode === 'play' && G.speed > 15) {
    const a = clamp((G.speed - 15) / 12, 0, 1) * 0.5;
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const seed = ((i * 0.618) % 1);
      const ph = (G.t * 2.2 + seed) % 1;
      const ang = (i % 2 ? 0.25 : Math.PI - 0.25) + (i % 2 ? 1 : -1) * seed * 0.9;
      const r0 = 60 + ph * H * 0.8, r1 = r0 + 30 + ph * 90;
      ctx.moveTo(cx + Math.cos(ang) * r0, horizonY + Math.sin(ang) * r0);
      ctx.lineTo(cx + Math.cos(ang) * r1, horizonY + Math.sin(ang) * r1);
    }
    ctx.stroke();
  }
  // rain
  if (G.drops.length) {
    ctx.fillStyle = `rgba(40,55,75,${0.2 * G.rain})`; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(200,220,255,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const d of G.drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.15, d.y + d.l); }
    ctx.stroke();
  }
  // bike ride timer
  if (G.p.bike > 0 && mode === 'play') {
    const k = G.p.bike / BIKE_TIME, bw = Math.min(W * 0.42, 220), bx = cx - bw / 2, by = 86; // under the corner buttons
    ctx.fillStyle = 'rgba(59,36,18,0.8)'; rr(bx - 4, by - 4, bw + 8, 22, 11); ctx.fill();
    ctx.fillStyle = '#e53935'; rr(bx, by, Math.max(14, bw * k), 14, 7); ctx.fill();
    ctx.font = `20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3b2412';
    ctx.strokeText('ON YER BIKE', cx, by - 15); ctx.fillStyle = '#fff'; ctx.fillText('ON YER BIKE', cx, by - 15);
  }
  // welly vignette
  if (G.p.welly > 0) {
    const g = ctx.createRadialGradient(cx, H / 2, H * 0.3, cx, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(255,215,0,0)'); g.addColorStop(1, `rgba(255,200,0,${0.35 + Math.sin(G.t * 10) * 0.1})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // particles
  for (const q of G.parts) {
    const a = 1 - q.t / q.life;
    ctx.globalAlpha = a;
    ell(q.x, q.y, q.r, q.r * 0.85, q.c);
  }
  ctx.globalAlpha = 1;
  // screen splats on death
  for (const s of G.splats) {
    const k = mode === 'dying' ? Math.min(1, G.dyingT * 6) : 1;
    const r = s.r * k;
    ctx.fillStyle = 'rgba(92,52,20,0.92)';
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * TAU, rr2 = r * (1 + Math.sin(i * 1.3 + s.seed) * 0.12 + (i % 4 === 0 ? 0.25 : 0));
      ctx.lineTo(s.x + Math.cos(a) * rr2, s.y + Math.sin(a) * rr2);
    }
    ctx.fill();
    const drip = s.drip * Math.min(1, (mode === 'dying' ? G.dyingT : 2) * 0.8);
    ctx.fillRect(s.x - r * 0.15, s.y, r * 0.3, drip + r * 0.5);
    ell(s.x, s.y + drip + r * 0.5, r * 0.2, r * 0.22, 'rgba(92,52,20,0.92)');
    ell(s.x - r * 0.3, s.y - r * 0.3, r * 0.2, r * 0.12, 'rgba(255,255,255,0.25)');
  }
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${G.flash * 0.6})`; ctx.fillRect(0, 0, W, H); }
  // floaters
  G.floats.forEach((f, i) => {
    const k = f.t / f.life;
    const pop = k < 0.15 ? 0.5 + (k / 0.15) * 0.7 : k < 0.25 ? 1.2 - ((k - 0.15) / 0.1) * 0.2 : 1;
    const y = H * 0.27 + (G.floats.length - 1 - i) * -f.size * 1.3 - k * 30;
    ctx.save();
    ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    ctx.translate(cx, y);
    ctx.rotate(Math.sin(i * 1.7 + f.size) * 0.06);
    ctx.scale(pop, pop);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${f.size}px ${FONT}`;
    ctx.lineWidth = f.size * 0.16; ctx.strokeStyle = '#3b2412'; ctx.lineJoin = 'round';
    ctx.strokeText(f.text, 0, 0); ctx.fillStyle = f.color; ctx.fillText(f.text, 0, 0);
    if (f.sub) {
      ctx.font = `${f.size * 0.42}px ${FONT}`; ctx.lineWidth = f.size * 0.09;
      ctx.strokeText(f.sub, 0, f.size * 0.7); ctx.fillStyle = '#fff'; ctx.fillText(f.sub, 0, f.size * 0.7);
    }
    ctx.restore();
  });
  // big SPLAT
  if (mode === 'dying') {
    const k = Math.min(1, G.dyingT * 4);
    const sc = k < 1 ? 0.3 + k * 1.1 : 1.4 - Math.min(0.2, (G.dyingT - 0.25) * 0.5);
    ctx.save(); ctx.translate(cx, H * 0.42); ctx.rotate(-0.12); ctx.scale(sc, sc);
    ctx.font = `${Math.min(W * 0.26, 120)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 16; ctx.strokeStyle = '#3b2412'; ctx.strokeText('SPLAT!', 0, 0);
    ctx.fillStyle = '#a8652c'; ctx.fillText('SPLAT!', 0, 0);
    ctx.restore();
  }
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.save();
  if (G.shake > 0) ctx.translate(rand(-G.shake, G.shake) * 0.5, rand(-G.shake, G.shake) * 0.5);
  drawSky();
  drawMountains();
  drawGround();
  drawBuildings();
  // distance haze
  const hz = ctx.createLinearGradient(0, horizonY - H * 0.01, 0, horizonY + H * 0.06);
  const hc = G.rain > 0.5 ? '160,168,176' : '214,236,246';
  hz.addColorStop(0, `rgba(${hc},0.55)`); hz.addColorStop(1, `rgba(${hc},0)`);
  ctx.fillStyle = hz; ctx.fillRect(0, horizonY - H * 0.01, W, H * 0.07);
  collectSprites();
  ctx.restore();
  drawOverlays();
}

// ---------------------------------------------------------------- HUD & screens
const hud = {
  root: $('hud'), score: $('score'), dist: $('dist'), bags: $('bags'), pause: $('pauseBtn'),
  last: '',
};
function updateHud() {
  const s = `${G.score}|${Math.floor(G.dist)}|${G.bags}`;
  if (s === hud.last) return;
  hud.last = s;
  hud.score.textContent = G.score;
  hud.dist.textContent = `${Math.floor(G.dist)}m`;
  hud.bags.textContent = G.bags;
}
const screens = ['title', 'over', 'board', 'pause'];
function show(id) { for (const s of screens) $(s).classList.toggle('hidden', s !== id); }

const cap = { root: $('caption'), title: $('capTitle'), fact: $('capFact'), timer: 0 };
function showCaption(title, fact, warn) {
  cap.title.textContent = title;
  cap.fact.textContent = fact;
  cap.root.classList.toggle('warn', !!warn);
  cap.root.classList.remove('hidden', 'show');
  void cap.root.offsetWidth; // restart the slide-in animation
  cap.root.classList.add('show');
  clearTimeout(cap.timer);
  cap.timer = setTimeout(hideCaption, warn ? 3200 : 3600);
}
function hideCaption() { clearTimeout(cap.timer); cap.root.classList.add('hidden'); cap.root.classList.remove('show'); }

function startGame() {
  Sound.init();
  newGame(false);
  mode = 'play';
  show(null);
  hud.root.classList.remove('hidden');
  hud.pause.classList.remove('hidden');
  hud.last = '';
  floater('AFF YE GO!', 'Mind the jobbies', { size: 54, life: 1.4 });
  Sound.startMusic();
  saved = false;
}

function pause() {
  if (mode !== 'play') return;
  mode = 'paused';
  Sound.stopMusic();
  Sound.sleep();
  show('pause');
}
function resume() {
  if (mode !== 'paused') return;
  mode = 'play';
  show(null);
  Sound.init();
  Sound.startMusic();
  last = performance.now();
}

let saved = false;
function gameOver() {
  mode = 'over';
  hud.pause.classList.add('hidden');
  hideCaption();
  Sound.sleep();
  const isBest = G.score > best;
  if (isBest) { best = G.score; store.set('ajd_best', String(best)); }
  $('overTitle').textContent = isBest && G.score > 0 ? 'NEW BEST!' : 'SPLAT!';
  $('overMsg').textContent = `${pick(DEATH[G.killer] || DEATH.small)} ${pick(QUIPS)}`;
  $('oScore').textContent = G.score;
  $('oDist').textContent = `${Math.floor(G.dist)}m`;
  $('oBags').textContent = G.bags;
  $('oDodged').textContent = G.dodged;
  $('saveForm').classList.remove('hidden');
  $('saveErr').textContent = '';
  const inp = $('initials');
  inp.value = (store.get('ajd_initials') || '').slice(0, 3);
  inp.disabled = false;
  validateInitials();
  show('over');
}

function validateInitials() {
  const inp = $('initials');
  const v = inp.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  if (inp.value !== v) inp.value = v;
  $('saveBtn').disabled = v.length !== 3 || saved;
}
$('initials').addEventListener('input', validateInitials);

$('saveForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (saved) return;
  const ini = $('initials').value.toUpperCase();
  if (!/^[A-Z]{3}$/.test(ini)) return;
  if (BAD.includes(ini)) { $('saveErr').textContent = 'Wash yer mooth oot. Try other initials.'; return; }
  $('saveBtn').disabled = true;
  $('initials').blur();
  try {
    const res = await Board.submit(ini, G.score);
    saved = true;
    store.set('ajd_initials', ini);
    renderBoard(res.scores, res.rank);
    show('board');
  } catch (err) {
    $('saveErr').textContent = err instanceof BoardError ? err.message : 'Could not save. Try again.';
    $('saveBtn').disabled = false;
  }
});

function renderBoard(scores, highlight = -1) {
  const ol = $('boardList');
  ol.innerHTML = '';
  if (!scores.length) {
    const li = document.createElement('li'); li.className = 'empty';
    li.textContent = 'Nae scores yet. Be the first!';
    ol.appendChild(li);
  }
  scores.slice(0, 10).forEach((s, i) => {
    const li = document.createElement('li');
    if (i === highlight) li.className = 'me';
    const ini = document.createElement('span'); ini.className = 'ini'; ini.textContent = s.initials;
    const sc = document.createElement('span'); sc.textContent = s.score;
    li.append(ini, sc);
    ol.appendChild(li);
  });
  $('boardMode').textContent = Board.mode === 'local' ? 'Scores saved on this device only' : 'Global leaderboard · all of Aberfeldy';
}

let boardBack = 'title';
async function openBoard(from) {
  boardBack = from;
  renderBoard([]);
  $('boardList').innerHTML = '<li class="empty">Loading…</li>';
  show('board');
  renderBoard(await Board.fetchTop());
}

$('playBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
$('boardPlayBtn').addEventListener('click', startGame);
$('titleBoardBtn').addEventListener('click', () => openBoard('title'));
$('overBoardBtn').addEventListener('click', () => openBoard('over'));
$('boardBackBtn').addEventListener('click', () => {
  if (boardBack === 'over' && mode === 'over' && !saved) show('over');
  else { goTitle(); }
});
$('resumeBtn').addEventListener('click', resume);
hud.pause.addEventListener('click', pause);

function goTitle() {
  mode = 'title';
  hideCaption();
  newGame(true);
  hud.root.classList.add('hidden');
  hud.pause.classList.add('hidden');
  $('best').textContent = best;
  show('title');
}

const muteBtn = $('muteBtn');
function syncMute() { muteBtn.textContent = Sound.muted ? '🔇' : '🔊'; }
muteBtn.addEventListener('click', () => { Sound.init(); Sound.setMuted(!Sound.muted); syncMute(); });
syncMute();

document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); Sound.sleep(); } });
// Any tap mid-run re-wakes audio (iOS can interrupt it after a call or notification).
document.addEventListener('touchend', () => { if (mode === 'play') Sound.init(); }, { passive: true });

// ---------------------------------------------------------------- main loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
  last = now;
  if (mode !== 'paused' && mode !== 'over') update(dt);
  else if (mode === 'over') { update(0); }
  Sound.tick();
  render();
  if (mode === 'play' || mode === 'dying') updateHud();
  requestAnimationFrame(frame);
}

resize();
goTitle();
if (document.fonts && document.fonts.load) document.fonts.load(`20px "Luckiest Guy"`).catch(() => {});
requestAnimationFrame(frame);

// tiny hook for automated smoke tests
window.__ajd = { get state() { return G; }, get mode() { return mode; }, startGame, move, jump, spawnRow };
})();
