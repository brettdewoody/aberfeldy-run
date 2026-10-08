# 💩 The Aberfeldy Jobbie Dash

An over-the-top, mobile-first endless runner about the dog poo on Aberfeldy's pavements.
Run along a street of Aberfeldy shopfronts in your kilt and tammy, past Wade's Bridge, the Black Watch
Memorial, the Birks o' Aberfeldy, the distillery, Castle Menzies and some unimpressed Highland coos,
with Schiehallion behind you the whole way.

Made in Aberfeldy by Brett DeWoody, from an original idea by Calum Maclean, and built with AI (Claude, by Anthropic) in about an hour: Brett described the
game and played each version on a phone, and Claude wrote all of the code.

## How to play

The game has a **How to play** page (❓ on the title screen, and shown once before your first run)
with every obstacle and pickup drawn as it appears in the game.

| Action | Touch | Keyboard |
| --- | --- | --- |
| Dodge left / right | Swipe ← → | ← → / A D |
| Jump | Tap or swipe ↑ | ↑ / W / Space |
| Drop fast | Swipe ↓ | ↓ / S |
| Pause | ❚❚ button | P / Esc |

- **Jobbies**, **squashed ones** and **bagged-and-dumped** ones can be jumped.
- **MEGA JOBBIES** (the ones with angry eyes) are too big to jump. Change lanes to get past them.
- **Hanging poo bags** on the poo bag tree: run underneath, but don't jump into them.
- **Swinging poo bags** sweep across the pavement. Time your lane, or jump them.
- **Skid marks** are long. Jump them or swerve.
- **Beavers** come up from the Tay and either drop a gnawed log across your lane (jump it)
  or build a whole dam (too big, dodge it).
- **Second-home 4x4s** park on the pavement with their hazards on, blocking the kerb lane. Go round them.
- Each golden **chanterelle** (foraged in the woods round Aberfeldy) is worth 10 points. Hurdles, close shaves
  and stomps also add points.
- 🚲 **The bike** floats at the top of a jump, above a jobbie, and is always guarded. Grab it and you're
  **on yer bike**: 5 seconds riding the road at high speed past everything on the pavement.
- 🥾 **Golden wellies** give 6 seconds of stomping through everything, hanging bags included.
- It gets faster the longer you go. Sometimes it rains. This is Scotland.

Landmarks you pass include Wade's Bridge, the Black Watch Memorial, the Birks o' Aberfeldy,
Aberfeldy Distillery, Castle Menzies, the Aberfeldy Footbridge, Taymouth Castle, the Scottish
Crannog Centre, the Fortingall Yew, Dull (twinned with Boring), the Grandtully rapids,
the golf club, a piper and some Highland coos. About one house in four on the high street is a dark,
curtains-shut second home or holiday let. A big brown tourist sign at the roadside
names each one as you approach.

When you're done, enter 3 initials, or tap **📣 Share** to brag via your phone's share sheet. The leaderboard shows the **Top 10** only.

## Deploying (recommended: Netlify, free)

Netlify hosts the game and the shared Top 10 together. Scores are stored in
[Netlify Blobs](https://docs.netlify.com/blobs/overview/), so there's no database to set up.

1. Sign in at [netlify.com](https://app.netlify.com) with GitHub.
2. **Add new site → Import an existing project → GitHub →** pick `aberfeldy-run`.
3. Leave every setting as it is (`netlify.toml` already has them) and click **Deploy**.

You get a URL like `https://aberfeldy-jobbie-dash.netlify.app` (you can rename it under Site settings).
The live game is at **https://jobbie.run** (custom domain set in Netlify).
Every push to `main` redeploys automatically. The leaderboard screen should say
**"Global leaderboard · all of Aberfeldy"**.

### Alternative: GitHub Pages (no extra account, per-device scores)

GitHub Pages only serves static files, so each phone keeps its **own** Top 10 there.
To turn it on:

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Repo **Settings → Secrets and variables → Actions → Variables →** add `DEPLOY_PAGES` = `true`.
3. Push to `main` (or run the "Deploy to GitHub Pages" workflow by hand).

## Cheat protection

Scores can't simply be posted to the server:

1. **RUN!** asks the server for a ticket recording when the run started, signed with `RUN_SECRET`.
2. At **game over** the game sends the ticket, distance and score. The server checks the distance was possible
   in the real time since the ticket (the game's top speed plus bike boosts) and that the score fits the
   distance, then returns a signed receipt.
3. Only a receipt can be saved to the Top 10, the score comes from the receipt, and each run is accepted once.

Runs and finishes in the stats are counted from those same server steps, not from messages the browser sends.
API requests must come from the game's own site, and visits are rate-limited (IP addresses are only held
briefly in memory, never stored). This stops typed-in, edited and replayed scores; it can't stop someone who
writes a bot that genuinely plays the game, which no browser game can.

Set `RUN_SECRET` (any long random string) in Netlify's environment variables. Without it, the server
can't sign runs and nobody can save to the global Top 10.

**Netlify environment variables the site needs** (Site configuration → Environment variables):

| Variable | What it's for |
| --- | --- |
| `RUN_SECRET` | Signs run tickets and receipts for the leaderboard. Any long random string. |
| `STATS_KEY` | The password for `/stats.html`. |

Functions only pick up a changed variable on the **next deploy**, so after adding or changing one,
use Deploys → Trigger deploy (or push any commit).

## Play statistics

The game keeps plain daily counts: visits, new players, runs started, runs finished, distance and best
score. Nothing identifies a player: no id, name, IP address or cookie is sent or stored. "New players"
is approximate: a visit counts as new if that browser hasn't yet got past the How to Play page (a flag
the game already keeps for showing that page once). Events go to `/api/event` and are stored in Netlify Blobs.

To see them, open **`https://jobbie.run/stats.html?key=YOUR_KEY`**, where the key is the `STATS_KEY` environment variable
set in Netlify (Site configuration → Environment variables). The page remembers the key on that device.
Self-hosting with `server.js`? Set `STATS_KEY` when starting it; stats are saved to `data/stats.json`.

## Running locally

Needs Node 18+.

```sh
npm start            # http://localhost:3000
PORT=8080 DATA_DIR=/var/lib/jobbie npm start
```

`server.js` serves `public/` and the same `/api/scores` API, saving the Top 10 to `data/scores.json`.
It has no dependencies, so you can also run it on any small server if you'd rather not use Netlify.

## Project layout

| Path | What it is |
| --- | --- |
| `public/` | The whole game (HTML, CSS, one JS file). No build step. |
| `lib/leaderboard.js` | Top 10 rules: validation, rude-word filter, ranking. |
| `netlify/functions/scores.mjs` | Leaderboard API on Netlify (uses `@netlify/blobs`). |
| `lib/runs.js` | Run tickets, receipts and the anti-cheat checks. |
| `netlify/functions/runs.mjs` | Ticket API on Netlify (`/api/run/start`, `/api/run/finish`). |
| `lib/stats.js` | Play statistics: event validation and daily totals. |
| `netlify/functions/stats.mjs` | Stats API on Netlify (`/api/event`, `/api/stats`). |
| `public/stats.html` | The private stats page. |
| `server.js` | Leaderboard + stats API and static server for local or self-hosted use. |

## Notes

- Icons (`favicon.svg`, PNG sizes, `site.webmanifest`) and the link-preview card (`og-image.jpg`, 1200×630) live in
  `public/`. The Open Graph / Twitter tags point at the live URL, so if the site moves, update them in `index.html`.

- The game itself has no dependencies or build step. The only package is `@netlify/blobs`, used by the Netlify function.
- Everything is drawn on canvas in code and all audio is synthesised with WebAudio, so there are no
  image or sound files. That includes the bagpipe drone and chanter tune.
- Initials are limited to A–Z and pass through a small rude-word filter. The server also rate-limits submissions.
- The cheat protection above stops casual faking, but a determined person could still script a fake run.
  That's fine for a village joke, but don't put prize money on it.
