// FloodGuard configuration — edit values below
const FG_CONFIG = {
  // WebSocket server URL used by the frontend. Default: localhost:5000/ws
  WS_URL: (function(){
    try{
      const proto = (location.protocol === 'https:') ? 'wss://' : 'ws://';
      const host = location.hostname || 'localhost';
      return proto + host + ':5000/ws';
    }catch(e){ return 'ws://localhost:5000/ws'; }
  })(),

  // Replace with your Google Maps API key (restrict it to your domain in Google Cloud Console)
  GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',

  // Optional: client-side Firebase config (if you want the frontend to read Firestore directly)
  // Leave `null` to rely on server-side Firebase Admin SDK instead.
  FIREBASE_CONFIG: null
};
