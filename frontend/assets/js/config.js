// FloodGuard configuration — edit values below
const FG_CONFIG = {
  // WebSocket server URL used by the frontend. Default: localhost:5000/ws
  // Backend base URL — used for WebSocket and can be used for API calls
  BACKEND_URL: (function(){
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'http://' + location.hostname + ':5000';
    }
    return 'https://floodguard-8sfc.onrender.com';
  })(),

  WS_URL: (function(){
    try{
      // Local development: connect to localhost backend
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        return 'ws://' + location.hostname + ':5000/ws';
      }
      // Production: connect directly to Render backend (Vercel can't proxy WebSockets)
      return 'wss://floodguard-8sfc.onrender.com/ws';
    }catch(e){ return 'ws://localhost:5000/ws'; }
  })(),

  // Replace with your Google Maps API key (restrict it to your domain in Google Cloud Console)
  GOOGLE_MAPS_API_KEY: 'AIzaSyA8DL6iCvkgVNCdKknc5G_qsQiAaiC6kwE',

  // Firebase client-side config for real-time Firestore access
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyBtWqoJgOOB9yGJzmPI1WR3dbIkNjB3UtE",
    authDomain: "floodguard-a024c.firebaseapp.com",
    databaseURL: "https://floodguard-a024c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "floodguard-a024c",
    storageBucket: "floodguard-a024c.firebasestorage.app",
    messagingSenderId: "913368784119",
    appId: "1:913368784119:web:9b7d93b64986ff5d6407f2",
    measurementId: "G-RHRH43R0W4"
  },

  // Thresholds (tweak to match your sensor units)
  WATER_LEVEL_THRESHOLD: 0.7, // example: fraction or metres depending on your device
  TEMPERATURE_THRESHOLD: null,

  // Collections used in Firestore (can be left as defaults)
  SENSOR_COLLECTION: 'sensor_readings',
  HELP_COLLECTION: 'helpRequests',
  ALERTS_COLLECTION: 'alerts',
  LOCATION_COLLECTION: 'user_locations',

  // Optional safe destinations used by the map navigation (name, lat, lng)
  SAFE_DESTINATIONS: [
    {name: 'Municipal Safe Point', lat: 20.0, lng: 78.0}
  ]
};
