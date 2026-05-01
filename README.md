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

