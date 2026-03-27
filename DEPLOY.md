# Deploy NEON SURGE (online play)

Follow **README.md** Part 3 for the full architecture. This file is a short checklist.

## 1. GitHub repository

1. Create a **public** repo (e.g. `neon-surge`).
2. Push this folder to `main` (root should contain `index.html`, `server.js`, `package.json`, `render.yaml`).

```bash
cd neon-surge
git init
git add .
git commit -m "NEON SURGE — client + WebSocket server"
git branch -M main
git remote add origin https://github.com/YOUR_USER/neon-surge.git
git push -u origin main
```

## 2. Render — WebSocket server

1. [render.com](https://render.com) → **New** → **Blueprint** (or **Web Service**).
2. Connect the GitHub repo.
3. If using **Web Service** manually:
   - **Runtime:** Node
   - **Build:** `npm install`
   - **Start:** `npm start`
   - **Instance:** Free
4. Create the service. Note the URL, e.g. `https://neon-surge-server.onrender.com`.
5. WebSockets use the **same host** with **`wss://`**:  
   `wss://neon-surge-server.onrender.com` (no path).

Optional: [UptimeRobot](https://uptimerobot.com) → HTTP GET `https://YOUR-SERVICE.onrender.com/health` every 5 minutes so the free tier stays awake.

## 3. GitHub Pages — game client

1. Repo → **Settings** → **Pages**.
2. **Source:** Deploy from branch **main**, folder **`/` (root)**.
3. Save. After ~1 minute the game is at:  
   `https://YOUR_USER.github.io/neon-surge/`

## 4. Point the client at your server

Pick **one**:

- **A.** In `index.html`, change the default `return 'wss://...'` in `resolveWsUrl()` to your exact Render `wss://` URL, **or**
- **B.** Open the game with a query string (no edit):  
  `https://YOUR_USER.github.io/neon-surge/?ws=wss://YOUR-SERVICE.onrender.com`
- **C.** In the browser console on your Pages site:  
  `localStorage.setItem('neon-surge-ws','wss://YOUR-SERVICE.onrender.com');`  
  then reload.

`localhost` / `127.0.0.1` still uses `ws://localhost:3000` automatically.

## 5. Smoke test

1. Open the GitHub Pages URL → **Solo Run** (no server needed).
2. **Co-op** → Create Room — should show a 6-character code if the WebSocket connects.
3. If Co-op fails, check the browser console for WebSocket errors and verify `wss://` matches Render exactly (HTTPS page → **wss**, not **ws**).
