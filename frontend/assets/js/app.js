(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  const i18n = {
      en: {
          nav_dashboard: "Dashboard", nav_synopsis: "Synopsis", nav_diagrams: "Diagrams", nav_safe_routes: "Safe Routes", nav_rescue: "Rescue",
          hero_title: "FloodGuard", hero_tagline: "AI-DRIVEN FLOOD PREDICTION & EMERGENCY RESPONSE",
          hero_map_title: "Escape Navigation", hero_map_tagline: "OPTIMIZED EVACUATION PATHS BASED ON AI RISK LEVELS",
          hero_rescue_title: "Rescue Operations Center", hero_rescue_tagline: "REAL-TIME SOS TRACKING & HEATMAP VISUALIZATION",
          card_risk_title: "AI Risk Prediction", status_standby: "System Standby",
          card_sensor_title: "Live Sensor Matrix", label_water_level: "Water Level", label_temp: "Temperature", label_humidity: "Humidity", label_rainfall: "Rainfall Forecast",
          btn_test_alert: "Test Alert", btn_share_location: "Share Location", btn_stop_sharing: "Stop Sharing", btn_locate: "Find Safe Routes",
          card_weather_title: "Atmospheric Data", weather_loading: "Loading weather data...",
          card_alert_title: "Emergency Broadcasts", form_sos_title: "Request Emergency Assistance", placeholder_name: "Your Name", btn_sos: "SEND SOS",
          sidebar_sos_title: "Active SOS Signals"
      },
      hi: {
          nav_dashboard: "डैशबोर्ड", nav_synopsis: "सारांश", nav_diagrams: "आरेख", nav_safe_routes: "सुरक्षित मार्ग", nav_rescue: "बचाव",
          hero_title: "फ्लडगार्ड", hero_tagline: "एआई-संचालित बाढ़ भविष्यवाणी और आपातकालीन प्रतिक्रिया",
          hero_map_title: "एस्केप नेविगेशन", hero_map_tagline: "एआई जोखिम स्तरों के आधार पर अनुकूलित निकासी मार्ग",
          hero_rescue_title: "बचाव अभियान केंद्र", hero_rescue_tagline: "रीयल-टाइम एसओएस ट्रैकिंग और हीटमैप विज़ुअलाइज़ेशन",
          card_risk_title: "एआई जोखिम भविष्यवाणी", status_standby: "सिस्टम स्टैंडबाय",
          card_sensor_title: "लाइव सेंसर मैट्रिक्स", label_water_level: "जल स्तर", label_temp: "तापमान", label_humidity: "नमी", label_rainfall: "वर्षा का पूर्वानुमान",
          btn_test_alert: "परीक्षण अलर्ट", btn_share_location: "स्थान साझा करें", btn_stop_sharing: "साझा करना बंद करें", btn_locate: "सुरक्षित मार्ग खोजें",
          card_weather_title: "वायुमंडलीय डेटा", weather_loading: "मौसम डेटा लोड हो रहा है...",
          card_alert_title: "आपातकालीन प्रसारण", form_sos_title: "आपातकालीन सहायता का अनुरोध करें", placeholder_name: "आपका नाम", btn_sos: "एसओएस भेजें",
          sidebar_sos_title: "सक्रिय एसओएस संकेत"
      },
      mr: {
          nav_dashboard: "डॅशबोर्ड", nav_synopsis: "सारांश", nav_diagrams: "आकृत्या", nav_safe_routes: "सुरक्षित मार्ग", nav_rescue: "बचाव",
          hero_title: "फ्लडगार्ड", hero_tagline: "एआय-आधारित पूर अंदाज आणि आपत्कालीन प्रतिसाद",
          hero_map_title: "एस्केप नेव्हिगेशन", hero_map_tagline: "एआय जोखीम स्तरांवर आधारित इष्टतम निर्वासन मार्ग",
          hero_rescue_title: "बचाव कार्य केंद्र", hero_rescue_tagline: "रिअल-टाइम एसओएस ट्रॅकिंग आणि हीटमॅप व्हिज्युअलायझेशन",
          card_risk_title: "एआय जोखीम अंदाज", status_standby: "सिस्टम स्टँडबाय",
          card_sensor_title: "थेट सेन्सर मॅट्रिक्स", label_water_level: "पाण्याची पातळी", label_temp: "तापमान", label_humidity: "दमटपणा", label_rainfall: "पावसाचा अंदाज",
          btn_test_alert: "चाचणी अलर्ट", btn_share_location: "स्थान शेअर करा", btn_stop_sharing: "शेअर करणे थांबवा", btn_locate: "सुरक्षित मार्ग शोधा",
          card_weather_title: "वातावरण डेटा", weather_loading: "हवामान डेटा लोड होत आहे...",
          card_alert_title: "आणीबाणीचे प्रसारण", form_sos_title: "आणीबाणीच्या मदतीसाठी विनंती करा", placeholder_name: "तुमचे नाव", btn_sos: "एसओएस पाठवा",
          sidebar_sos_title: "सक्रिय एसओएस सिग्नल"
      }
  };

  window.setLang = function(lang) {
      document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          if (i18n[lang][key]) el.textContent = i18n[lang][key];
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
          const key = el.getAttribute('data-i18n-placeholder');
          if (i18n[lang][key]) el.placeholder = i18n[lang][key];
      });
      document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
  };

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
            const resp = await fetch('/api/predict', {
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
            const resp = await fetch('/api/weather');
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

    document.getElementById('test-alert').addEventListener('click', ()=>{
      fetch('/api/alert', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'System Alert: Flood risk assessment in progress.'})});
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
                showAlertBox('SOS TRANSMITTED. Rescue teams notified.', true);
            }
        });
    });

    window.addEventListener('fg:firebase-ready', (ev)=>{
      if(!ev.detail || !ev.detail.available || !window.FG_DB) return;
      const col = FG_DB.collection(FG_CONFIG.SENSOR_COLLECTION || 'sensor_readings').orderBy('ts','desc').limit(1);
      col.onSnapshot(async snap=>{
          if(snap.empty) return;
          const doc = snap.docs[0].data();
          const w = doc.waterLevel || doc.water_level || 0;
          document.getElementById('tempVal').textContent = (doc.temp || 25) + ' °C';
          document.getElementById('humVal').textContent = (doc.hum || 50) + ' %';
          document.getElementById('waterVal').textContent = (w * 100).toFixed(1) + ' %';
          updateChart(w);
      });
    });
  });
})();
