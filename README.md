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

- **Jobbies** and **squashed ones** can be jumped.
- **MEGA JOBBIES** (the ones with angry eyes) are too big to jump. Change lanes to get past them.
- Scottie dogs run out and leave fresh ones in front of you.
- Each 🟢 **poo bag** is worth 10 points. Hurdles (+10), close shaves past a mega (+25) and stomps also add points.
- 🥾 **Golden wellies** give 6 seconds of stomping through everything.
- It gets faster the longer you go. Sometimes it rains. This is Scotland.

When you're done, enter 3 initials. The leaderboard shows the **Top 10** only.

## Running it

Needs Node 18+. There are no dependencies.

```sh
npm start            # http://localhost:3000
PORT=8080 DATA_DIR=/var/lib/jobbie npm start
```

`server.js` serves `public/` and a shared leaderboard at `/api/scores`. It keeps only the top 10 and
writes them to `data/scores.json`, or to `$DATA_DIR/scores.json` if you set `DATA_DIR`.

### Static hosting (GitHub Pages, Netlify, etc.)

You can host the `public/` folder on its own. Without the server, the game falls back to a
**per-device** Top 10 saved in the browser's localStorage. The leaderboard screen says which mode is in use.
For a leaderboard the whole town shares, run `server.js` somewhere with a persistent disk
(e.g. Render, Fly.io, Railway or a small VPS).

## Notes

- Everything is drawn on canvas in code and all audio is synthesised with WebAudio, so there are no
  image or sound files. That includes the bagpipe drone and chanter tune.
- Initials are limited to A–Z and pass through a small rude-word filter. The server also rate-limits submissions.
- Scores are submitted by the client, so a determined person could fake one. That's fine for a
  village joke, but don't put prize money on it.
