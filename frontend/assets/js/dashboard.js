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

      // Initialize
      loadGoogleMaps();

      function updateDetailedLabels(data) {
          const labels = {
              'waterLevelVal': data.water_level !== undefined ? (data.water_level * 100).toFixed(0) + '%' : null,
              'rainVal': data.rainfall !== undefined ? data.rainfall + 'mm/h' : null,
              'tremorVal': data.vib_z !== undefined ? (data.vib_z).toFixed(1) + 'g' : null,
              'vibXVal': data.vib_x !== undefined ? (data.vib_x).toFixed(2) : null,
              'vibYVal': data.vib_y !== undefined ? (data.vib_y).toFixed(2) : null,
              'vibZVal': data.vib_z !== undefined ? (data.vib_z).toFixed(2) : null,
              'shockVal': data.shock_alert !== undefined ? (data.shock_alert ? 'YES' : 'NO') : null,
              'gasVal': data.gas_ppm !== undefined ? (data.gas_ppm).toFixed(1) + ' ppm' : null,
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
