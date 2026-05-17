(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }



  ready(()=>{
      // We will listen to Firebase directly for the 3 collections: flood_data, quake_data, fire_data.
      let riskScores = { flood: 0, quake: 0, fire: 0 };
      let lastHeard = { flood: 0, quake: 0, fire: 0 };

      function parseTimestamp(ts) {
          if (!ts) return Date.now();
          if (typeof ts === 'number') {
              // Python time.time() is in seconds. JS Date uses milliseconds.
              return ts < 10000000000 ? ts * 1000 : ts;
          }
          if (ts.seconds !== undefined) {
              return ts.seconds * 1000;
          }
          const parsed = new Date(ts).getTime();
          return isNaN(parsed) ? Date.now() : parsed;
      }

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

          // Refresh dynamic module heartbeats (Online vs Standby)
          updateHeartbeats();

          // Cache for offline mode
          if (window.cacheSensorData) {
            window.cacheSensorData({
              floodRisk: riskScores.flood,
              quakeRisk: riskScores.quake,
              fireRisk: riskScores.fire
            });
          }
      }

      function updateHeartbeats() {
          const now = Date.now();
          const threshold = 15000; // 15 seconds

          const nodes = ['flood', 'quake', 'fire'];
          nodes.forEach(node => {
              const dot = document.getElementById(node + 'StatusDot');
              const txt = document.getElementById(node + 'StatusText');
              if (!dot || !txt) return;

              const isOnline = (now - lastHeard[node]) < threshold;
              
              if (isOnline) {
                  dot.className = 'status-dot online';
                  txt.textContent = 'Online';
              } else {
                  dot.className = 'status-dot warning';
                  txt.textContent = 'Standby';
              }
          });
      }

      // Check heartbeats every 3 seconds to immediately reflect node state changes
      setInterval(updateHeartbeats, 3000);

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
                      window.dispatchEvent(new CustomEvent('lg:risk-color', { detail: { color: { r: 239, g: 68, b: 68 } } })); // Danger Red
                  } else if (maxRisk > 20) {
                      circle.style.stroke = 'var(--warning)';
                      if(statusEl) statusEl.textContent = 'Elevated Risk';
                      if(bgAnim) bgAnim.classList.remove('emergency-red');
                      window.dispatchEvent(new CustomEvent('lg:risk-color', { detail: { color: { r: 245, g: 158, b: 11 } } })); // Warning Amber
                  } else {
                      circle.style.stroke = 'var(--primary)';
                      if(statusEl) statusEl.textContent = 'System Standby';
                      if(bgAnim) bgAnim.classList.remove('emergency-red');
                      window.dispatchEvent(new CustomEvent('lg:risk-color', { detail: { color: { r: 0, g: 210, b: 255 } } })); // Primary Cyan
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

      function getActiveDisaster() {
          const { flood, quake, fire } = riskScores;
          const max = Math.max(flood, quake, fire);
          if (max < 15) return 'none'; // No significant threat
          if (max === flood) return 'flood';
          if (max === quake) return 'quake';
          return 'fire';
      }

      function getSafeSearchCriteria(type) {
          switch(type) {
              case 'quake': return { type: 'park' }; // Best for open grounds
              case 'flood': return { keyword: 'hill', type: 'natural_feature' }; // Elevated natural areas
              case 'fire':  return { keyword: 'lake', type: 'natural_feature' }; // Water bodies
              default:      return { keyword: 'safe zone', type: 'point_of_interest' };
          }
      }

      function showSafeRoutes(lat, lng) {
          renderers.forEach(r => r.setMap(null)); 
          renderers.length = 0;

          const disasterType = getActiveDisaster();
          const criteria = getSafeSearchCriteria(disasterType);
          const service = new google.maps.places.PlacesService(map);
          
          service.nearbySearch({
              location: {lat, lng},
              radius: 10000, // 10km
              ...criteria
          }, (results, status) => {
              let dests = [];
              if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                  // Take top 3 results
                  dests = results.slice(0, 3).map(p => ({
                      name: p.name,
                      lat: p.geometry.location.lat(),
                      lng: p.geometry.location.lng()
                  }));
              } else {
                  // Fallback to hardcoded or dynamic offset if no places found
                  dests = LG_CONFIG.SAFE_DESTINATIONS;
                  if(!dests || dests.length === 0) {
                      const suffix = disasterType === 'none' ? 'Safe Zone' : 
                                   disasterType === 'flood' ? 'High Ground' : 
                                   disasterType === 'quake' ? 'Open Area' : 'Water Source';
                      dests = [{name: `Nearest ${suffix} (Estimated)`, lat: lat + 0.015, lng: lng + 0.015}];
                  }
              }

              processRouting(lat, lng, dests);
          });
      }

      function processRouting(lat, lng, dests) {
          const origin = new google.maps.LatLng(lat, lng);
          
          const card = document.getElementById('navInfoCard');
          const nameEl = document.getElementById('nearestPointName');
          const etaEl = document.getElementById('navEta');

          // Collect all route promises
          const routePromises = dests.map(d => {
              return new Promise((resolve) => {
                  directionsService.route({
                      origin: origin,
                      destination: new google.maps.LatLng(d.lat, d.lng),
                      travelMode: 'WALKING'
                  }, (result, status) => {
                      if (status === 'OK') {
                          resolve({ result, dest: d, duration: result.routes[0].legs[0].duration.value });
                      } else {
                          resolve(null); // Route failed (e.g., unroutable point)
                      }
                  });
              });
          });

          // Wait for all routes to be calculated
          Promise.all(routePromises).then(routes => {
              // Filter out failed routes
              const validRoutes = routes.filter(r => r !== null);
              
              if (validRoutes.length === 0) {
                  if(nameEl) nameEl.textContent = "No viable routes found";
                  if(etaEl) etaEl.textContent = "---";
                  if(card) card.style.display = 'block';
                  return;
              }

              // Find the absolute fastest route
              validRoutes.sort((a, b) => a.duration - b.duration);
              const bestRoute = validRoutes[0];

              // Update UI Card with the best route
              if(card) card.style.display = 'block';
              if(nameEl) nameEl.textContent = bestRoute.dest.name;
              if(etaEl) etaEl.textContent = bestRoute.result.routes[0].legs[0].duration.text;

              // Draw all routes
              validRoutes.forEach(r => {
                  const isBest = (r === bestRoute);
                  const renderer = new google.maps.DirectionsRenderer({
                      map: map, 
                      directions: r.result, 
                      suppressMarkers: false,
                      polylineOptions: { 
                          strokeColor: isBest ? '#4ade80' : 'rgba(148, 163, 184, 0.4)', 
                          strokeWeight: isBest ? 6 : 4, 
                          strokeOpacity: isBest ? 0.9 : 0.5,
                          zIndex: isBest ? 100 : 1
                      }
                  });
                  renderers.push(renderer);
              });
          });
      }

      // Atmospheric Weather Reporting Routine
      async function fetchWeather() {
          const weatherEl = document.getElementById('weather');
          if(!weatherEl) return;
          
          const backendUrl = (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.BACKEND_URL) ? LG_CONFIG.BACKEND_URL : '';
          try {
              let query = '';
              try {
                  const pos = await new Promise((resolve, reject) => {
                      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
                  });
                  query = `?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`;
              } catch(ge) {
                  // Fallback to default lat/lon set on server
              }
              
              const resp = await fetch(backendUrl + '/api/weather' + query);
              const data = await resp.json();
              if(data && data.main && data.weather && data.weather[0]){
                  const temp = data.main.temp;
                  const humidity = data.main.humidity;
                  const desc = data.weather[0].description;
                  const wind = data.wind ? data.wind.speed : 0;
                  
                  // Dynamic meteorological icons
                  let weatherIcon = '☀️';
                  const condition = data.weather[0].main.toLowerCase();
                  if(condition.includes('cloud')) weatherIcon = '☁️';
                  else if(condition.includes('rain')) weatherIcon = '🌧️';
                  else if(condition.includes('thunder')) weatherIcon = '⛈️';
                  else if(condition.includes('snow')) weatherIcon = '❄️';
                  else if(condition.includes('mist') || condition.includes('haze') || condition.includes('fog')) weatherIcon = '🌫️';

                  weatherEl.classList.remove('weather-placeholder');
                  weatherEl.innerHTML = `
                      <div class="weather-container" style="display:flex; flex-direction:column; gap:0.5rem; justify-content:center; align-items:flex-start; height:100%;">
                          <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                              <span style="font-size:2.2rem; font-weight:700; color:var(--primary); line-height:1.2;">${temp.toFixed(1)} °C</span>
                              <span style="font-size:1.8rem; filter:drop-shadow(0 0 4px var(--primary-glow));">${weatherIcon}</span>
                          </div>
                          <div style="font-size:0.85rem; text-transform:capitalize; color:var(--text-dim); margin-bottom:0.5rem;">
                              ${desc}
                          </div>
                          <div style="display:grid; grid-template-columns:1fr 1fr; width:100%; gap:0.5rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:0.5rem; font-size:0.75rem; color:var(--text-dim);">
                              <div>💧 Humidity: <span style="color:var(--text); font-weight:600;">${humidity}%</span></div>
                              <div>💨 Wind: <span style="color:var(--text); font-weight:600;">${wind} m/s</span></div>
                          </div>
                      </div>
                  `;
              }
          } catch(e){
              console.warn('[Weather] Error fetching weather:', e);
              weatherEl.innerHTML = '<p style="color:var(--text-dim); font-size:0.85rem; text-align:center;">Atmospheric link offline</p>';
          }
      }

      // Initialize
      loadGoogleMaps();
      fetchWeather();
      setInterval(fetchWeather, 60000);

      function updateDetailedLabels(data) {
          const labels = {
              'waterLevelVal': data.water_level !== undefined ? (data.water_level * 100).toFixed(0) + '%' : null,
              'rainVal': data.rainfall !== undefined ? data.rainfall + 'mm/h' : null,
              'tremorVal': data.vib_z !== undefined ? (data.vib_z).toFixed(1) + 'g' : null,
              'vibXVal': data.vib_x !== undefined ? (data.vib_x).toFixed(2) : null,
              'vibYVal': data.vib_y !== undefined ? (data.vib_y).toFixed(2) : null,
              'vibZVal': data.vib_z !== undefined ? (data.vib_z).toFixed(2) : null,
              'shockVal': data.shock_alert !== undefined ? (data.shock_alert ? 'YES' : 'NO') : null,
              'gasVal': (data.gas_ppm !== undefined) ? (data.gas_ppm).toFixed(1) + ' ppm' : 
                        (data.gas_raw !== undefined) ? (data.gas_raw / 4095.0 * 2000).toFixed(0) + ' ppm' : null,
              'tempVal': data.temperature !== undefined ? (data.temperature).toFixed(1) + ' °C' : null,
              'humVal': data.humidity !== undefined ? (data.humidity).toFixed(1) + ' %' : null,
              'flameVal': data.flame_detected !== undefined ? (data.flame_detected ? 'YES' : 'NO') : null
          };

          for(let id in labels) {
              if (labels[id] === null) continue;
              const el = document.getElementById(id);
              if(el) {
                  el.textContent = labels[id];
                  if (id === 'flameVal' || id === 'shockVal') {
                    el.style.color = (labels[id] === 'YES') ? '#ff4b2b' : '#4ade80';
                  }
              }
          }
      }

      window.addEventListener('lg:firebase-ready', (ev) => {
          console.log('[Firebase] Ready state:', ev.detail.available);
          if (!ev.detail || !ev.detail.available || !window.LG_DB) {
            console.warn('[Firebase] Database not available for real-time updates.');
            return;
          }

          // Listen to Flood Data
          LG_DB.collection('flood_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  const data = snap.docs[0].data();
                  console.log('[Firebase] New Flood Data:', data);
                  riskScores.flood = data.ai_risk_score || 0;
                  
                  // Record latest heartbeat timestamp using helper
                  lastHeard.flood = parseTimestamp(data.timestamp);

                  updateDashboard();
                  updateDetailedLabels(data);
              }
          }, err => console.error('[Firebase] Flood stream error:', err));

          // Listen to Quake Data
          LG_DB.collection('quake_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  const data = snap.docs[0].data();
                  console.log('[Firebase] New Quake Data:', data);
                  riskScores.quake = data.ai_risk_score || 0;

                  // Record latest heartbeat timestamp using helper
                  lastHeard.quake = parseTimestamp(data.timestamp);

                  updateDashboard();
                  updateDetailedLabels(data);
              }
          }, err => console.error('[Firebase] Quake stream error:', err));

          // Listen to Fire Data
          LG_DB.collection('fire_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  const data = snap.docs[0].data();
                  console.log('[Firebase] New Fire Data:', data);
                  riskScores.fire = data.ai_risk_score || 0;

                  // Record latest heartbeat timestamp using helper
                  lastHeard.fire = parseTimestamp(data.timestamp);

                  updateDashboard();
                  updateDetailedLabels(data);
              }
          }, err => console.error('[Firebase] Fire stream error:', err));

          // Listen for simulation data (Keep for testing)
          window.addEventListener('lg:sim-data', (e) => {
              const data = e.detail;
              riskScores.flood = Math.round(data.water_level * 100);
              riskScores.quake = Math.round(data.vib_z * 10);
              riskScores.fire = Math.round((data.gas_ppm / 2000) * 100);
              
              updateDashboard();
              updateDetailedLabels(data);
          });
      });
  });
})();
