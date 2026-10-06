# 💩 The Aberfeldy Jobbie Dash

An over-the-top, mobile-first endless runner about the dog poo on Aberfeldy's pavements.
Run along a street of Aberfeldy shopfronts in your kilt and tammy, past Wade's Bridge, the Black Watch
Memorial, the Birks o' Aberfeldy, the distillery, Castle Menzies and some unimpressed Highland coos,
with Schiehallion behind you the whole way.

## How to play

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
- Scottie dogs run out and leave fresh ones in front of you.
- Each 🟢 **poo bag** is worth 10 points. Hurdles, close shaves and stomps also add points.
- 🥾 **Golden wellies** give 6 seconds of stomping through everything, hanging bags included.
- It gets faster the longer you go. Sometimes it rains. This is Scotland.

Landmarks you pass include Wade's Bridge, the Black Watch Memorial, the Birks o' Aberfeldy,
Aberfeldy Distillery, Castle Menzies, the Aberfeldy Footbridge, Taymouth Castle, the Scottish
Crannog Centre, the Fortingall Yew, Dull (twinned with Boring), the Grandtully rapids,
the golf club, a piper and some Highland coos. A caption at the bottom of the screen
names each one as you go by.

When you're done, enter 3 initials. The leaderboard shows the **Top 10** only.

## Deploying (recommended: Netlify, free)

Netlify hosts the game and the shared Top 10 together. Scores are stored in
[Netlify Blobs](https://docs.netlify.com/blobs/overview/), so there's no database to set up.

1. Sign in at [netlify.com](https://app.netlify.com) with GitHub.
2. **Add new site → Import an existing project → GitHub →** pick `aberfeldy-run`.
3. Leave every setting as it is (`netlify.toml` already has them) and click **Deploy**.

You get a URL like `https://aberfeldy-jobbie-dash.netlify.app` (you can rename it under Site settings).
Every push to `main` redeploys automatically. The leaderboard screen should say
**"Global leaderboard · all of Aberfeldy"**.

### Alternative: GitHub Pages (no extra account, per-device scores)

GitHub Pages only serves static files, so each phone keeps its **own** Top 10 there.
To turn it on:

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Repo **Settings → Secrets and variables → Actions → Variables →** add `DEPLOY_PAGES` = `true`.
3. Push to `main` (or run the "Deploy to GitHub Pages" workflow by hand).

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
| `server.js` | Leaderboard API + static server for local or self-hosted use. |

## Notes

- The game itself has no dependencies or build step. The only package is `@netlify/blobs`, used by the Netlify function.
- Everything is drawn on canvas in code and all audio is synthesised with WebAudio, so there are no
  image or sound files. That includes the bagpipe drone and chanter tune.
- Initials are limited to A–Z and pass through a small rude-word filter. The server also rate-limits submissions.
- Scores are submitted by the client, so a determined person could fake one. That's fine for a
  village joke, but don't put prize money on it.
