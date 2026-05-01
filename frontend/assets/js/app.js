(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(()=>{
    const statusEl = document.getElementById('status');
    const riskValEl = document.getElementById('riskVal');
    const riskCircle = document.getElementById('riskCircle');
    const riskStatusEl = document.getElementById('riskStatus');
    const riskRecEl = document.getElementById('riskRecommendation');
    
    const sensorChartCtx = document.getElementById('sensorChart').getContext('2d');
    
    const WS_URL = (typeof FG_CONFIG !== 'undefined' && FG_CONFIG.WS_URL) ? FG_CONFIG.WS_URL : ((location.protocol === 'https:') ? 'wss://' : 'ws://') + location.host;
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
    }

    async function fetchPrediction(waterLevel, rain, hum, temp) {
        try {
            const resp = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ water_level: waterLevel, rainfall: rain, humidity: hum, temperature: temp })
            });
            const data = await resp.json();
            updateRiskUI(data);
        } catch (e) { console.error('Prediction fetch failed', e); }
    }

    async function fetchWeather() {
        try {
            const resp = await fetch('/api/weather');
            const data = await resp.json();
            if (data.main) {
                document.getElementById('weatherDesc').textContent = `Local: ${data.weather[0].description} | Wind: ${data.wind.speed} m/s`;
                document.getElementById('rainVal').textContent = (data.rain ? data.rain['1h'] : 0) + ' mm/h';
                return data;
            }
        } catch (e) { console.error('Weather fetch failed', e); }
        return null;
    }

    function connect(){
      try{ socket = new WebSocket(WS_URL); }catch(e){ console.warn('WebSocket error', e); setTimeout(connect,3000); return; }

      socket.addEventListener('open', ()=>{ 
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
          } else if(data.type === 'location'){
            window.dispatchEvent(new CustomEvent('fg:location', {detail: data}));
          }
        }catch(e){ }
      });

      socket.addEventListener('close', ()=>{ 
          if(statusEl) {
              statusEl.textContent = 'Status: Disconnected';
              statusEl.className = 'status disconnected';
          }
          setTimeout(connect,3000); 
      });
    }

    function showAlertBox(msg, isUrgent = false){
      const box = document.getElementById('alertBox');
      if(box){
        const item = document.createElement('div');
        item.className = 'alert-item' + (isUrgent ? ' urgent' : '');
        item.textContent = msg;
        box.prepend(item);
        if (isUrgent) {
            if(confirm(msg + '\n\nView Safe Routes?')){ window.location.href = 'map.html'; }
        }
      }
    }

    // Initialize
    connect();
    fetchWeather();
    setInterval(fetchWeather, 60000); // Update weather every minute

    // Event listeners
    document.getElementById('test-alert').addEventListener('click', ()=>{
      fetch('/api/alert', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'System Alert: Periodic flood risk assessment initiated.'})});
    });

    document.getElementById('start-sharing').addEventListener('click', ()=>{
      if(!navigator.geolocation) return alert('Geolocation not supported');
      watchId = navigator.geolocation.watchPosition(pos=>{
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        if(socket && socket.readyState === WebSocket.OPEN){ socket.send(JSON.stringify({type:'location', lat, lng})); }
      });
      document.getElementById('start-sharing').hidden = true;
      document.getElementById('stop-sharing').hidden = false;
    });

    document.getElementById('stop-sharing').addEventListener('click', ()=>{
      if(watchId !== null) navigator.geolocation.clearWatch(watchId);
      document.getElementById('start-sharing').hidden = false;
      document.getElementById('stop-sharing').hidden = true;
    });

    document.getElementById('helpBtn').addEventListener('click', ()=>{
        const name = document.getElementById('helpName').value || 'Anonymous';
        navigator.geolocation.getCurrentPosition(pos=>{
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            if(socket && socket.readyState === WebSocket.OPEN){
                socket.send(JSON.stringify({type:'location', lat, lng, isSOS: true, name: name}));
                showAlertBox('SOS TRANSMITTED. Emergency services notified.', true);
            }
        });
    });

    // Firebase Listener
    window.addEventListener('fg:firebase-ready', (ev)=>{
      if(!ev.detail || !ev.detail.available || !window.FG_DB) return;
      
      const col = FG_DB.collection(FG_CONFIG.SENSOR_COLLECTION || 'sensor_readings').orderBy('ts','desc').limit(1);
      col.onSnapshot(async snap=>{
          if(snap.empty) return;
          const doc = snap.docs[0].data();
          const t = doc.temperature || doc.temp || 25;
          const h = doc.humidity || doc.hum || 50;
          const w = doc.waterLevel || doc.water_level || 0;
          
          document.getElementById('tempVal').textContent = t + ' °C';
          document.getElementById('humVal').textContent = h + ' %';
          document.getElementById('waterVal').textContent = (w * 100).toFixed(1) + ' %';
          
          // Update Chart
          const now = new Date().toLocaleTimeString();
          sensorChart.data.labels.push(now);
          sensorChart.data.datasets[0].data.push(w * 100);
          if (sensorChart.data.labels.length > 10) {
              sensorChart.data.labels.shift();
              sensorChart.data.datasets[0].data.shift();
          }
          sensorChart.update();
          
          // Get Prediction
          const rainText = document.getElementById('rainVal').textContent;
          const rain = parseFloat(rainText) || 0;
          fetchPrediction(w, rain, h, t);
      });
    });
  });
})();
