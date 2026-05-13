(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }



  ready(()=>{
      // We will listen to Firebase directly for the 3 collections: flood_data, quake_data, fire_data.
      let riskScores = { flood: 0, quake: 0, fire: 0 };

      function updateDashboard() {
          // Update the 3 module cards
          const fRisk = riskScores.flood;
          const qRisk = riskScores.quake;
          const fiRisk = riskScores.fire;

          const fEl = document.getElementById('floodRiskSummary');
          const qEl = document.getElementById('quakeRiskSummary');
          const fiEl = document.getElementById('fireRiskSummary');

          if(fEl) { fEl.textContent = fRisk + '%'; fEl.className = 'status ' + getRiskClass(fRisk); }
          if(qEl) { qEl.textContent = qRisk + '%'; qEl.className = 'status ' + getRiskClass(qRisk); }
          if(fiEl) { fiEl.textContent = fiRisk + '%'; fiEl.className = 'status ' + getRiskClass(fiRisk); }

          // Calculate Integrated Risk
          updateIntegratedRisk();

          // Cache for offline mode
          if (window.cacheSensorData) {
            window.cacheSensorData({
              floodRisk: riskScores.flood,
              quakeRisk: riskScores.quake,
              fireRisk: riskScores.fire
            });
          }
      }

      function updateIntegratedRisk() {
          const maxRisk = Math.max(riskScores.flood, riskScores.quake, riskScores.fire);
          const valEl = document.getElementById('riskValue');
          const statusEl = document.getElementById('riskStatus');
          const circle = document.getElementById('riskCircle');
          const bgAnim = document.getElementById('bgAnim');

          if(valEl) {
              valEl.textContent = maxRisk + '%';
              const offset = 565 - (565 * maxRisk / 100);
              if(circle) {
                  circle.style.strokeDashoffset = offset;
                  
                  if(maxRisk > 50) {
                      circle.style.stroke = 'var(--danger)';
                      if(statusEl) statusEl.textContent = 'Critical Alert';
                      if(bgAnim) bgAnim.classList.add('emergency-red');
                  } else if (maxRisk > 20) {
                      circle.style.stroke = 'var(--warning)';
                      if(statusEl) statusEl.textContent = 'Elevated Risk';
                      if(bgAnim) bgAnim.classList.remove('emergency-red');
                  } else {
                      circle.style.stroke = 'var(--primary)';
                      if(statusEl) statusEl.textContent = 'System Standby';
                      if(bgAnim) bgAnim.classList.remove('emergency-red');
                  }
              }
          }
      }

      function getRiskClass(risk) {
          if (risk > 50) return 'danger';
          if (risk > 20) return 'warning';
          return 'safe';
      }

      // --- DASHBOARD MAP LOGIC ---
      let map, directionsService;
      let userMarker = null;
      const renderers = [];

      function loadGoogleMaps(cb){
          if(typeof LG_CONFIG === 'undefined' || !LG_CONFIG.GOOGLE_MAPS_API_KEY) return;
          if(window.google && window.google.maps) return cb();
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${LG_CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places`;
          script.async = true; script.defer = true; script.onload = cb;
          document.head.appendChild(script);
      }

      function initMap() {
          const mapEl = document.getElementById('dashboardMap');
          if(!mapEl) return;

          directionsService = new google.maps.DirectionsService();
          map = new google.maps.Map(mapEl, {
              center: {lat: 20.0, lng: 78.0},
              zoom: 5,
              disableDefaultUI: true,
              zoomControl: true,
              styles: [
                { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
                { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
              ]
          });

          startTracking();

          document.getElementById('locateOnDashboard').addEventListener('click', () => {
              navigator.geolocation.getCurrentPosition(pos => {
                  showSafeRoutes(pos.coords.latitude, pos.coords.longitude);
              });
          });
      }

      function startTracking() {
          if(!navigator.geolocation) return;
          navigator.geolocation.watchPosition(pos => {
              const p = {lat: pos.coords.latitude, lng: pos.coords.longitude};
              if(userMarker) userMarker.setPosition(p);
              else {
                  userMarker = new google.maps.Marker({
                      position: p,
                      map: map,
                      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#00d2ff', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }
                  });
                  map.setCenter(p);
                  map.setZoom(13);
              }
          }, null, {enableHighAccuracy:true});
      }

      function showSafeRoutes(lat, lng) {
          renderers.forEach(r => r.setMap(null)); renderers.length = 0;
          const dests = LG_CONFIG.SAFE_DESTINATIONS || [];
          const origin = new google.maps.LatLng(lat, lng);

          dests.forEach((d, i) => {
              directionsService.route({
                  origin: origin,
                  destination: new google.maps.LatLng(d.lat, d.lng),
                  travelMode: 'DRIVING'
              }, (result, status) => {
                  if (status == 'OK') {
                      const renderer = new google.maps.DirectionsRenderer({
                          map: map, directions: result, suppressMarkers: false,
                          polylineOptions: { strokeColor: i === 0 ? '#4ade80' : '#94a3b8', strokeWeight: 5, strokeOpacity: 0.7 }
                      });
                      renderers.push(renderer);
                  }
              });
          });
      }

      // Initialize
      loadGoogleMaps(initMap);

      window.addEventListener('lg:firebase-ready', (ev) => {
          if (!ev.detail || !ev.detail.available || !window.LG_DB) return;

          // Listen to Flood Data
          LG_DB.collection('flood_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  riskScores.flood = snap.docs[0].data().ai_risk_score || 0;
                  updateDashboard();
              }
          });

          // Listen to Quake Data
          LG_DB.collection('quake_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  riskScores.quake = snap.docs[0].data().ai_risk_score || 0;
                  updateDashboard();
              }
          });

          // Listen to Fire Data
          LG_DB.collection('fire_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  riskScores.fire = snap.docs[0].data().ai_risk_score || 0;
                  updateDashboard();
              }
          });
      });
  });
})();
