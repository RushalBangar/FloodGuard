# FloodGuard
AI-Driven Flood Prediction & Alert System

FloodGuard is a comprehensive solution for flood monitoring and emergency response, featuring real-time sensor integration, AI-driven alerts, and a rescue dashboard with live location sharing.

## Project Structure

- **`backend/`**: Pure Python Flask server handling WebSockets and Firebase integration.
- **`frontend/`**: Vanilla HTML/CSS/JS frontend organized with a clean asset structure.
- **`database/`**: Documentation of the Firestore schema.
- **`scripts/`**: Utility scripts for build and configuration.

---

## Local Development

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Windows
.\.venv\Scripts\Activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Firebase Configuration
Download your `serviceAccountKey.json` from the Firebase Console and place it in the `backend/` root directory.

### 3. Run the Server
```bash
python main.py
```
The server will start at `http://localhost:5000`.

---

## Deployment

### 1. Backend (Render)
We use a `render.yaml` blueprint for automated deployment.
1. Create a new **Blueprint** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Add the following **Environment Variables** in the Render dashboard:
   - `SERVICE_ACCOUNT_JSON`: The full content of your `serviceAccountKey.json`.
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API key.
4. Render will automatically build and deploy the service.

### 2. Frontend (Vercel)
1. Import your repository into [Vercel](https://vercel.com).
2. Set the **Root Directory** to `frontend`.
3. Configure the **Build Command** to: `node ../scripts/gen-config.js` (if using dynamic config).
4. Add **Environment Variables**:
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API key.
   - `WS_URL`: The URL of your Render backend (e.g., `wss://your-app.onrender.com/ws`).
5. Vercel will deploy your static site and proxy API calls to Render.

---

## Security & Best Practices
- **Environment Variables**: Never commit `serviceAccountKey.json` or API keys. Use the secret managers provided by Vercel and Render.
- **CORS**: Ensure your Render backend allows requests from your Vercel domain.
- **TLS**: Both Vercel and Render provide automatic HTTPS, which is required for secure WebSocket (`wss://`) and geolocation sharing.
