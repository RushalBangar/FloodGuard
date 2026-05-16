(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }



  ready(()=>{
    const statusEl = document.getElementById('status');
    const riskValEl = document.getElementById('riskVal');
    const riskCircle = document.getElementById('riskCircle');
    const riskStatusEl = document.getElementById('riskStatus');
    const riskRecEl = document.getElementById('riskRecommendation');
    const sensorChartCtx = document.getElementById('sensorChart').getContext('2d');
    
    const WS_URL = (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.WS_URL) ? LG_CONFIG.WS_URL : ((location.protocol === 'https:') ? 'wss://' : 'ws://') + location.host;
    let socket = null;
    let watchId = null;
    
    // Initialize Chart
    const sensorChart = new Chart(sensorChartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Water Level',
                data: [],
                borderColor: '#00d2ff',
                backgroundColor: 'rgba(0, 210, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    function updateRiskUI(riskData) {
        riskValEl.textContent = `${riskData.risk_percentage}%`;
        riskStatusEl.textContent = riskData.status;
        riskRecEl.textContent = riskData.recommendation;
        
        let color = '#4ade80'; // Normal
        if (riskData.status === 'Advisory') color = '#fbc02d';
        if (riskData.status === 'Danger') color = '#ff4b2b';
        
        riskCircle.style.borderColor = color;
        riskValEl.style.color = color;
        riskStatusEl.style.color = color;
        riskStatusEl.className = `status ${riskData.status.toLowerCase()}`;

        // Weather Background Control
        const bg = document.getElementById('bgAnim');
        if (bg) {
            bg.classList.toggle('raining', riskData.risk_percentage > 40);
            bg.classList.toggle('flood', riskData.risk_percentage > 70);
            bg.classList.toggle('lightning', riskData.risk_percentage > 85);
        }
    }

    async function fetchPrediction(waterLevel, rain, hum, temp) {
        try {
            const backendUrl = (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.BACKEND_URL) ? LG_CONFIG.BACKEND_URL : '';
            const resp = await fetch(backendUrl + '/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ water_level: waterLevel, rainfall: rain, humidity: hum, temperature: temp })
            });
            const data = await resp.json();
            updateRiskUI(data);
        } catch (e) { }
    }

    async function fetchWeather() {
        try {
            const backendUrl = (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.BACKEND_URL) ? LG_CONFIG.BACKEND_URL : '';
            const resp = await fetch(backendUrl + '/api/weather');
            const data = await resp.json();
            if (data.main) {
                document.getElementById('weatherDesc').textContent = `Local: ${data.weather[0].description} | Wind: ${data.wind.speed} m/s`;
                document.getElementById('rainVal').textContent = (data.rain ? (data.rain['1h'] || 0) : 0) + ' mm/h';
                return data;
            }
        } catch (e) { }
        return null;
    }

    let wsRetryDelay = 3000;
    const WS_MAX_RETRY = 30000;

    function connect(){
      try{ socket = new WebSocket(WS_URL); }catch(e){ wsRetryDelay = Math.min(wsRetryDelay * 2, WS_MAX_RETRY); setTimeout(connect, wsRetryDelay); return; }

      socket.addEventListener('open', ()=>{ 
          wsRetryDelay = 3000; // reset on successful connection
          if(statusEl) {
              statusEl.textContent = 'Status: Connected';
              statusEl.className = 'status connected';
          }
      });

      socket.addEventListener('message', ev=>{
        try{
          const data = JSON.parse(ev.data);
          if(data.type === 'alert'){
            showAlertBox(data.message || 'Flood warning', true);
          } else if(data.type === 'simulation'){
            handleSimulation(data);
          }
        }catch(e){ }
      });

      socket.addEventListener('close', ()=>{ 
          if(statusEl) {
              statusEl.textContent = 'Status: Disconnected';
              statusEl.className = 'status disconnected';
          }
          wsRetryDelay = Math.min(wsRetryDelay * 2, WS_MAX_RETRY);
          setTimeout(connect, wsRetryDelay); 
      });
    }

    function handleSimulation(data) {
        if(data.water_level !== undefined) {
            document.getElementById('waterVal').textContent = (data.water_level * 100).toFixed(1) + ' %';
            updateChart(data.water_level);
        }
        if(data.rainfall !== undefined) document.getElementById('rainVal').textContent = data.rainfall + ' mm/h';
        
        // Cache for offline mode
        if (window.cacheSensorData) {
          window.cacheSensorData({
            waterLevel: (data.water_level !== undefined) ? (data.water_level * 100).toFixed(1) + ' %' : undefined,
            temperature: data.temperature ? data.temperature.toFixed(1) + ' °C' : undefined,
            humidity: data.humidity ? data.humidity.toFixed(1) + ' %' : undefined
          });
        }

        const w = parseFloat(data.water_level || 0);
        const r = parseFloat(data.rainfall || 0);
        fetchPrediction(w, r, 60, 28);
    }

    function updateChart(val) {
        const now = new Date().toLocaleTimeString();
        sensorChart.data.labels.push(now);
        sensorChart.data.datasets[0].data.push(val * 100);
        if (sensorChart.data.labels.length > 10) {
            sensorChart.data.labels.shift();
            sensorChart.data.datasets[0].data.shift();
        }
        sensorChart.update();
    }

    function showAlertBox(msg, isUrgent = false){
      const box = document.getElementById('alertBox');
      if(box){
        const item = document.createElement('div');
        item.className = 'alert-item' + (isUrgent ? ' urgent' : '');
        item.textContent = msg;
        box.prepend(item);
      }
    }

    connect();
    fetchWeather();
    setInterval(fetchWeather, 60000);

    const testAlertBtn = document.getElementById('test-alert');
    if (testAlertBtn) {
      testAlertBtn.addEventListener('click', ()=>{
        const backendUrl = (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.BACKEND_URL) ? LG_CONFIG.BACKEND_URL : '';
        fetch(backendUrl + '/api/alert', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'System Alert: Flood risk assessment in progress.'})});
      });
    }

    const startSharingBtn = document.getElementById('start-sharing');
    const stopSharingBtn = document.getElementById('stop-sharing');

    if (startSharingBtn) {
      startSharingBtn.addEventListener('click', ()=>{
        if(!navigator.geolocation) return alert('Geolocation not supported');
        
        watchId = navigator.geolocation.watchPosition(pos=>{
          const lat = pos.coords.latitude, lng = pos.coords.longitude;
          
          // 1. Broadcast via WebSocket
          if(socket && socket.readyState === WebSocket.OPEN){ 
            socket.send(JSON.stringify({type:'location', lat, lng})); 
          }
          
          // 2. Write to Firestore
          if(window.LG_DB) {
              const colName = (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.LOCATION_COLLECTION) ? LG_CONFIG.LOCATION_COLLECTION : 'user_locations';
              const uid = (socket && socket.id) ? socket.id : 'anon_' + Math.random().toString(36).substr(2, 9);
              LG_DB.collection(colName).doc(uid).set({
                  lat, lng,
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true });
          }
        }, (err) => {
          console.error('Geolocation error:', err);
        }, { enableHighAccuracy: true });

        startSharingBtn.hidden = true;
        if (stopSharingBtn) stopSharingBtn.hidden = false;
      });
    }

    if (stopSharingBtn) {
      stopSharingBtn.addEventListener('click', ()=>{
        if(watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (startSharingBtn) startSharingBtn.hidden = false;
        stopSharingBtn.hidden = true;
      });
    }

    document.getElementById('helpBtn').addEventListener('click', (ev)=>{
        const btn = ev.currentTarget;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'LOCATING...';

        const name = document.getElementById('helpName').value || 'Anonymous';
        navigator.geolocation.getCurrentPosition(pos=>{
            btn.disabled = false;
            btn.textContent = originalText;

            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            const sosData = {
                name: name,
                lat: lat,
                lng: lng,
                isSOS: true,
                timestamp: new Date().toISOString(),
                status: 'active'
            };
            
            // Helper to send via REST API fallback if Firestore fails
            const sendViaAPI = () => {
                const backendUrl = (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.BACKEND_URL) ? LG_CONFIG.BACKEND_URL : '';
                fetch(backendUrl + '/api/sos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat, lng, name })
                }).then(r => r.json()).then(data => {
                    if(data.ok) showAlertBox('SOS TRANSMITTED via backup. Rescue notified.', true);
                }).catch(() => {
                    showAlertBox('SOS failed — no connection. Please call emergency services.', true);
                });
            };

            // 1. Write to Firestore (primary — persists in database)
            if(window.LG_DB) {
                const colName = (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.HELP_COLLECTION) ? LG_CONFIG.HELP_COLLECTION : 'helpRequests';
                LG_DB.collection(colName).add({
                    ...sosData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    showAlertBox('SOS TRANSMITTED. Rescue teams notified.', true);
                }).catch(e => {
                    console.error('Firestore SOS write failed:', e);
                    sendViaAPI(); // Fallback to server if Firestore write is blocked
                });
            } else {
                sendViaAPI(); // Fallback if Firestore isn't initialized
            }

            // 2. Also broadcast via WebSocket for real-time delivery
            if(socket && socket.readyState === WebSocket.OPEN){
                socket.send(JSON.stringify({type:'location', lat, lng, isSOS: true, name: name}));
            }
        }, err => {
            btn.disabled = false;
            btn.textContent = originalText;
            showAlertBox('Location access denied. Please enable GPS for SOS.', true);
        }, { enableHighAccuracy: true });
    });

    window.addEventListener('lg:firebase-ready', (ev)=>{
      if(!ev.detail || !ev.detail.available || !window.LG_DB) return;
      
      // Request Notification Permission
      if (window.LG_MESSAGING) {
        LG_MESSAGING.getToken({ vapidKey: LG_CONFIG.VAPID_KEY }).then((currentToken) => {
          if (currentToken) {
            console.log('FCM Token:', currentToken);
            // In a real app, you'd send this to your backend to associate with the user
            localStorage.setItem('fcm_token', currentToken);
          } else {
            console.log('No registration token available. Requesting permission...');
          }
        }).catch((err) => {
          console.log('An error occurred while retrieving token. ', err);
        });
      }

      const col = LG_DB.collection('flood_data').orderBy('timestamp','desc').limit(1);
      col.onSnapshot(async snap=>{
          if(snap.empty) return;
          const doc = snap.docs[0].data();
          const w = doc.water_level || 0;
          const r = doc.rainfall || 0;
          document.getElementById('tempVal').textContent = (doc.temperature || 25).toFixed(1) + ' °C';
          document.getElementById('humVal').textContent = (doc.humidity || 50).toFixed(1) + ' %';
          document.getElementById('waterVal').textContent = (w * 100).toFixed(1) + ' %';
          document.getElementById('rainVal').textContent = r + ' mm/h';
          updateChart(w);

          // Use AI Risk Score from database if available, otherwise fetch prediction
          if(doc.ai_risk_score !== undefined) {
              updateRiskUI({
                  risk_percentage: doc.ai_risk_score,
                  status: doc.ai_risk_score > 50 ? 'Danger' : (doc.ai_risk_score > 20 ? 'Advisory' : 'Safe'),
                  recommendation: doc.ai_risk_score > 50 ? 'Evacuate immediately.' : 'Monitor levels.'
              });
          }
      });

      // Listen for persistent alerts in Firestore
      const alertColName = (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.ALERTS_COLLECTION) ? LG_CONFIG.ALERTS_COLLECTION : 'alerts';
      const shownAlerts = new Set();
      LG_DB.collection(alertColName).orderBy('timestamp', 'desc').limit(5).onSnapshot(snap => {
          snap.docChanges().forEach(change => {
              if (change.type === 'added') {
                  const data = change.doc.data();
                  const alertId = change.doc.id;
                  if (!shownAlerts.has(alertId)) {
                      shownAlerts.add(alertId);
                      showAlertBox(data.message || 'Emergency Alert', data.type === 'alert');
                  }
              }
          });
      });
    });
  });
})();
