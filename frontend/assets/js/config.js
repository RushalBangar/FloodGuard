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
  GOOGLE_MAPS_API_KEY: 'AIzaSyA8DL6iCvkgVNCdKknc5G_qsQiAaiC6kwE',

  // Optional: client-side Firebase config (if you want the frontend to read Firestore directly)
  // Replace with your Firebase web SDK config object or leave `null` to rely on server-side Firebase Admin SDK.
  FIREBASE_CONFIG: null,

  // Thresholds (tweak to match your sensor units)
  WATER_LEVEL_THRESHOLD: 0.7, // example: fraction or metres depending on your device
  TEMPERATURE_THRESHOLD: null,

  // Collections used in Firestore (can be left as defaults)
  SENSOR_COLLECTION: 'sensor_readings',
  HELP_COLLECTION: 'helpRequests',
  ALERTS_COLLECTION: 'alerts',

  // Optional safe destinations used by the map navigation (name, lat, lng)
  SAFE_DESTINATIONS: [
    {name: 'Municipal Safe Point', lat: 20.0, lng: 78.0}
  ]
};
