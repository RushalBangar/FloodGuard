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
      let isEvacuating = false; 
      const renderers = [];

      window.dashboardInitMap = function() {
          const mapEl = document.getElementById('dashboardMap');
          if(!mapEl) return;

          directionsService = new google.maps.DirectionsService();
          map = new google.maps.Map(mapEl, {
              mapId: "DEMO_MAP_ID",
              center: {lat: 20.0, lng: 78.0},
              zoom: 5,
              disableDefaultUI: true,
              zoomControl: true
          });

          startTracking();

          document.getElementById('locateOnDashboard').addEventListener('click', () => {
              isEvacuating = true;
              navigator.geolocation.getCurrentPosition(pos => {
                  const p = {lat: pos.coords.latitude, lng: pos.coords.longitude};
                  map.setCenter(p);
                  map.setZoom(15);
                  showSafeRoutes(p.lat, p.lng);
              });
          });
      };

      function loadGoogleMaps(){
          if(typeof LG_CONFIG === 'undefined' || !LG_CONFIG.GOOGLE_MAPS_API_KEY) return;
          if(window.google && window.google.maps && window.google.maps.DirectionsService) return window.dashboardInitMap();
          
          // Prevent multiple script injections
          if (document.querySelector('script[src*="maps.googleapis.com"]')) {
              const checkReady = setInterval(() => {
                  if (window.google && window.google.maps && window.google.maps.DirectionsService) {
                      clearInterval(checkReady);
                      window.dashboardInitMap();
                  }
              }, 100);
              return;
          }

          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${LG_CONFIG.GOOGLE_MAPS_API_KEY}&loading=async&libraries=places,marker&callback=dashboardInitMap`;
          script.async = true; script.defer = true;
          document.head.appendChild(script);
      }

      function startTracking() {
          if(!navigator.geolocation) return;
          navigator.geolocation.watchPosition(pos => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              const p = {lat, lng};

              if(userMarker) userMarker.position = p;
              else {
                  const pin = document.createElement('div');
                  pin.style.width = '20px';
                  pin.style.height = '20px';
                  pin.style.backgroundColor = '#00d2ff';
                  pin.style.border = '3px solid #fff';
                  pin.style.borderRadius = '50%';
                  pin.style.boxShadow = '0 0 10px rgba(0,210,255,0.5)';

                  userMarker = new google.maps.marker.AdvancedMarkerElement({
                      position: p,
                      map: map,
                      content: pin
                  });
                  map.setCenter(p);
                  map.setZoom(14);
              }

              if (isEvacuating) {
                  showSafeRoutes(lat, lng);
              }
          }, null, {enableHighAccuracy:true, maximumAge: 2000});
      }

      function showSafeRoutes(lat, lng) {
          renderers.forEach(r => r.setMap(null)); renderers.length = 0;
          let dests = LG_CONFIG.SAFE_DESTINATIONS;
          if(!dests || dests.length === 0) {
              dests = [{name: 'Nearest High Ground', lat: lat + 0.015, lng: lng + 0.015}];
          }

          const origin = new google.maps.LatLng(lat, lng);
          let shortestTime = Infinity;
          let nearestNode = null;

          const card = document.getElementById('navInfoCard');
          const nameEl = document.getElementById('nearestPointName');
          const etaEl = document.getElementById('navEta');

          dests.forEach((d, i) => {
              directionsService.route({
                  origin: origin,
                  destination: new google.maps.LatLng(d.lat, d.lng),
                  travelMode: 'DRIVING'
              }, (result, status) => {
                  if (status == 'OK') {
                      const duration = result.routes[0].legs[0].duration.value; // seconds
                      
                      // Highlight the fastest route
                      const isBest = duration < shortestTime;
                      if(isBest) {
                          shortestTime = duration;
                          nearestNode = d;
                          
                          // Update UI Card
                          if(card) card.style.display = 'block';
                          if(nameEl) nameEl.textContent = d.name;
                          if(etaEl) etaEl.textContent = result.routes[0].legs[0].duration.text;
                      }

                      const renderer = new google.maps.DirectionsRenderer({
                          map: map, 
                          directions: result, 
                          suppressMarkers: false,
                          polylineOptions: { 
                              strokeColor: isBest ? '#4ade80' : 'rgba(148, 163, 184, 0.4)', 
                              strokeWeight: isBest ? 6 : 4, 
                              strokeOpacity: isBest ? 0.9 : 0.5,
                              zIndex: isBest ? 100 : 1
                          }
                      });
                      renderers.push(renderer);
                  }
              });
          });
      }

      // Initialize
      loadGoogleMaps();

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
