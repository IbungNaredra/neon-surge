# Deploy NEON SURGE (online play)

Follow **README.md** Part 3 for architecture. WebSocket relay stays on **Render** (or any Node host); the **browser client** can be on **Vercel**, GitHub Pages, or any static host.

## 1. Git repository

Push this repo (root has `index.html`, `server.js`, `package.json`, `render.yaml`, `vercel.json`).

## 2. Render — WebSocket server (Co-op)

1. [render.com](https://render.com) → **New** → **Web Service** (or Blueprint from `render.yaml`).
2. Connect the repo; **Build:** `npm install` · **Start:** `npm start`.
3. Your relay URL: `wss://YOUR-SERVICE.onrender.com` (same hostname as `https://`, use **`wss`**).

Optional: [UptimeRobot](https://uptimerobot.com) → GET `https://YOUR-SERVICE.onrender.com/health` every 5 minutes.

## 3. Vercel — game client (static)

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import your Git repo.
2. **Framework preset:** Other (or N/A).
3. **Root directory:** repository root (where `index.html` lives).
4. **Build Command:** leave empty, or use `echo static` — the game is a single static `index.html`; no framework build.
5. **Output directory:** leave default / empty (Vercel serves the repo root; `vercel.json` rewrites routes to `index.html`).
6. Deploy. Your game URL will be something like `https://neon-surge.vercel.app` or your custom domain.

`/.vercelignore` skips `node_modules` so uploads stay small (dependencies are only needed for Render’s `server.js`).

### GitHub Pages (optional)

Instead of Vercel: repo **Settings → Pages** → branch **main**, folder **`/`** → `https://YOUR_USER.github.io/REPO/`

## 4. Point the client at your WebSocket server

Pick **one** (works the same on Vercel or GitHub Pages):

- **A.** In `index.html`, set the default `return 'wss://...'` in `resolveWsUrl()` to your Render URL.
- **B.** Open the game with:  
  `https://YOUR-VERCEL-URL.vercel.app/?ws=wss://YOUR-SERVICE.onrender.com`
- **C.** Browser console:  
  `localStorage.setItem('neon-surge-ws','wss://YOUR-SERVICE.onrender.com');`  
  then reload.

`localhost` / `127.0.0.1` still uses `ws://localhost:3000` automatically.

## 5. Smoke test

1. Open your **Vercel** URL → **Solo Run** (no server).
2. **Co-op** → Create Room — should show a room code when `wss://` is correct.
3. If Co-op fails, check the console for WebSocket errors (HTTPS site must use **`wss://`**, not `ws://`).
