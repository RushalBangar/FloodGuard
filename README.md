# FloodGuard
AI-Driven Flood Prediction &amp; Alert System

This folder contains a static website demo and both a Node.js demo server and a Python demo server for live alerts and location sharing.

Servers:

- Node demo server (optional): [FloodGuard/server/server.js](server/server.js) — runs at port 3000 by default (already included earlier).
- Python demo server (preferred for this workspace): [FloodGuard/server/python/server.py](server/python/server.py) — runs at port 5000 and supports WebSocket at `/ws`.

Python server (recommended):

1. Create and activate a virtual environment and install dependencies:

```powershell
cd FloodGuard\server\python
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. (Optional) To enable saving locations to Firebase Firestore, create a Firebase project and download a service account JSON file (from Firebase Console → Project Settings → Service Accounts). Save it as `FloodGuard/server/python/serviceAccountKey.json`.

3. Start the Python server:

```powershell
python server.py
```

4. Open http://localhost:5000/index.html in your browser.

Configuration:

- Set your Google Maps API key in `[FloodGuard/assets/js/config.js](assets/js/config.js#L1)` by replacing `YOUR_GOOGLE_MAPS_API_KEY`.
- If you want client-side Firebase reads, paste your Firebase web config into `FG_CONFIG.FIREBASE_CONFIG` in `assets/js/config.js`.

Notes & security:

- The demo uses WebSocket to broadcast alerts and locations. For production you should run the server behind TLS, add authentication, and secure access to the Firebase project.
- Google Maps API keys should be restricted to allowed domains in Google Cloud Console.
- For push notifications (native while browser closed), implement Web Push (service worker + VAPID) on top of this demo.

How the requested improvements map to this project:

- Mobile alert + Help map: implemented as in-page confirm + native Notification API; the Help button opens the `map.html` page which shows suggested safe routes (demo). For production use Web Push for reliable native push notifications.
- Live location sharing: the frontend uses the Geolocation API to stream coordinates to the WebSocket server; the Python server optionally writes those coordinates to Firestore when a service account is provided; the rescue dashboard (`rescue.html`) shows live markers.

Next steps I can take for you:

- Paste the PDF-sourced synopsis text here and I will format and insert it into `[FloodGuard/synopsis.html](synopsis.html)`.
- Replace the demo safe-route logic with Google Directions API routing (requires Google Maps Directions API enabled).
- Wire client-side Firebase access (if you prefer real-time Firestore listeners in the browser).

Deploying frontend to Vercel and backend to Render
-----------------------------------------------

Quick summary:

- Frontend (static) → Vercel (deploys from GitHub, set root to repo root).
- Backend (Python Flask + WebSocket) → Render (Web Service from `server/python`).

Helper script

 - `scripts/gen-config.js` will generate `assets/js/config.js` from environment variables at build time. Use it in your Vercel Build Command to avoid committing API keys.

Vercel (frontend) — recommended steps

1. In Vercel, import this GitHub repo `RushalBangar/FloodGuard`.
2. Set **Root Directory** to the repository root (the static `index.html` is at the repo root). For Framework Preset choose `Other`.
3. Build & Output Settings:
	- Build Command (optional): `node scripts/gen-config.js`
	- Output Directory: `.`
4. Add Environment Variables (Vercel Dashboard → Settings → Environment Variables):
	- `GOOGLE_MAPS_API_KEY` — your Google Maps API key
	- `FIREBASE_CONFIG` — JSON string of your Firebase web config (optional)
	- `WATER_LEVEL_THRESHOLD`, `SENSOR_COLLECTION`, `HELP_COLLECTION` (optional)
5. Deploy; Vercel will run the Build Command and publish the static site.

Render (backend) — recommended steps

1. On Render, create a new **Web Service** and connect your GitHub repo `RushalBangar/FloodGuard`.
2. Set **Root Directory** to `server/python` and branch `main`.
3. Build Command:

```
pip install -r requirements.txt
```

4. Start Command (use a Render environment variable named `SERVICE_ACCOUNT_JSON` containing the service account JSON):

```
bash -lc "echo \"$SERVICE_ACCOUNT_JSON\" > serviceAccountKey.json && gunicorn server:app -b 0.0.0.0:$PORT --workers 4 --timeout 120"
```

5. Environment variables to add in Render dashboard:
	- `SERVICE_ACCOUNT_JSON` — the entire Firebase service account JSON (keep secret)
	- `GOOGLE_MAPS_API_KEY` (if backend needs it)

6. Deploy. Render will run the Build Command then run the Start Command which writes the service account file and starts Gunicorn.

Security notes

- Do not commit secrets (service account, API keys) to the repo; use Vercel/Render environment variables or secrets.
- `server/python/serviceAccountKey.json` is in `.gitignore` to avoid accidental commits. If you have already committed secrets, rotate them immediately.

Want me to wire this up?

- I can add a `render.yaml` or Dockerfile for fully automated Render deployment, or set up Vercel build settings if you authorize the connections. Tell me which and I'll proceed.

