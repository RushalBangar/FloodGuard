// Shared client script: WebSocket connection, alert handling, geolocation sharing
(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(()=>{
    const statusEl = document.getElementById('status');
    const testBtn = document.getElementById('test-alert');
    const startBtn = document.getElementById('start-sharing');
    const stopBtn = document.getElementById('stop-sharing');

    const WS_URL = (typeof FG_CONFIG !== 'undefined' && FG_CONFIG.WS_URL) ? FG_CONFIG.WS_URL : ((location.protocol === 'https:') ? 'wss://' : 'ws://') + location.host;
    let socket = null;
    let watchId = null;

    function connect(){
      try{ socket = new WebSocket(WS_URL); }catch(e){ console.warn('WebSocket error', e); setTimeout(connect,3000); return; }

      socket.addEventListener('open', ()=>{ if(statusEl) statusEl.textContent = 'Status: Connected'; });

      socket.addEventListener('message', ev=>{
        try{
          const data = JSON.parse(ev.data);
          if(data.type === 'alert'){
            const msg = data.message || 'Flood warning';
            if(confirm(msg + '\n\nOpen help (safe routes)?')){ window.location.href = 'map.html?alert=1'; }

            if('Notification' in window && Notification.permission === 'granted'){
              const n = new Notification('FloodGuard Alert', {body: msg});
              n.onclick = ()=>{ window.focus(); window.location.href = 'map.html?alert=1'; };
            } else if('Notification' in window && Notification.permission !== 'denied'){
              Notification.requestPermission().then(p=>{ if(p==='granted') new Notification('FloodGuard Alert',{body: msg}); });
            }

          } else if(data.type === 'location'){
            window.dispatchEvent(new CustomEvent('fg:location', {detail: data}));
          } else if(data.type === 'welcome'){
            console.info('FloodGuard socket id', data.id);
          }
        }catch(e){ console.warn('Invalid WS message', e); }
      });

      socket.addEventListener('close', ()=>{ if(statusEl) statusEl.textContent = 'Status: Disconnected'; setTimeout(connect,3000); });
      socket.addEventListener('error', ()=>{});
    }

    connect();

    if(testBtn) testBtn.addEventListener('click', ()=>{
      fetch('/api/alert', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Test flood alert — follow safety instructions.'})});
    });

    if(startBtn) startBtn.addEventListener('click', ()=>{
      if(!navigator.geolocation) return alert('Geolocation not supported');
      watchId = navigator.geolocation.watchPosition(pos=>{
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        if(statusEl) statusEl.textContent = `Status: Sharing location ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if(socket && socket.readyState === WebSocket.OPEN){ socket.send(JSON.stringify({type:'location', lat, lng})); }
      }, err=>{ alert('Geolocation error: '+err.message); }, {enableHighAccuracy:true, maximumAge:5000});
      if(startBtn) startBtn.hidden = true; if(stopBtn) stopBtn.hidden = false;
    });

    if(stopBtn) stopBtn.addEventListener('click', ()=>{
      if(watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = null; if(startBtn) startBtn.hidden = false; if(stopBtn) stopBtn.hidden = true; if(statusEl) statusEl.textContent = 'Status: Connected';
      if(socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({type:'stop_sharing'}));
    });

    // ---- Firebase-driven features (live data, help requests) ----
    function showAlertBox(msg){
      const box = document.getElementById('alertBox');
      if(box){
        box.innerHTML = '<div class="alert-item">'+msg+'</div>' + box.innerHTML;
        box.classList.add('pulse');
        setTimeout(()=> box.classList.remove('pulse'), 2000);
      }
      if('Notification' in window && Notification.permission === 'granted'){
        new Notification('FloodGuard', {body: msg});
      }
    }

    function sendHelpRequest(name, lat, lng){
      if(window.FG_DB){
        window.FG_DB.collection(FG_CONFIG.HELP_COLLECTION || 'helpRequests').add({name: name || 'Anonymous', lat, lng, ts: new Date(), status: 'open'})
        .then(()=> showAlertBox('Help request sent — rescue teams alerted'))
        .catch(e=> alert('Failed to send help request: '+e.message));
      }else if(socket && socket.readyState === WebSocket.OPEN){
        socket.send(JSON.stringify({type:'help_request', name: name || 'Anonymous', lat, lng}));
        showAlertBox('Help request sent via socket');
      }else{
        alert('Unable to send help request (no network)');
      }
    }

    // Attach help button
    const helpBtn = document.getElementById('helpBtn');
    if(helpBtn){
      helpBtn.addEventListener('click', ()=>{
        const name = (document.getElementById('helpName')||{}).value || 'Anonymous';
        if(!navigator.geolocation) return alert('Geolocation not supported');
        navigator.geolocation.getCurrentPosition(pos=>{
          sendHelpRequest(name, pos.coords.latitude, pos.coords.longitude);
        }, err=> alert('Location error: '+err.message));
      });
    }

    // Live Firestore listeners (when firebase client ready)
    window.addEventListener('fg:firebase-ready', (ev)=>{
      const available = ev.detail && ev.detail.available;
      if(!available || !window.FG_DB) return;

      // Listen to latest sensor reading
      try{
        const col = FG_DB.collection(FG_CONFIG.SENSOR_COLLECTION || 'sensor_readings').orderBy('ts','desc').limit(1);
        col.onSnapshot(snap=>{
          if(snap.empty) return;
          const doc = snap.docs[0].data();
          const t = doc.temperature || doc.temp || '—';
          const h = doc.humidity || doc.hum || '—';
          const w = doc.waterLevel || doc.water_level || doc.water || '—';
          const tempEl = document.getElementById('tempVal'); if(tempEl) tempEl.textContent = t;
          const humEl = document.getElementById('humVal'); if(humEl) humEl.textContent = h;
          const waterEl = document.getElementById('waterVal'); if(waterEl) waterEl.textContent = w;

          const threshold = FG_CONFIG.WATER_LEVEL_THRESHOLD;
          if(threshold !== null && threshold !== undefined && parseFloat(w) >= parseFloat(threshold)){
            showAlertBox('Flood predicted — water level above threshold');
          }
        });
      }catch(e){ console.warn('Sensor listener failed', e); }

      // Listen to alerts collection
      try{
        FG_DB.collection(FG_CONFIG.ALERTS_COLLECTION || 'alerts').orderBy('ts','desc').limit(5).onSnapshot(snap=>{
          snap.docChanges().forEach(ch=>{
            if(ch.type === 'added') showAlertBox(ch.doc.data().message || 'Alert');
          });
        });
      }catch(e){ }
    });

    // Rescue dashboard: listen to help requests and forward to in-page event for map
    window.addEventListener('fg:firebase-ready', (ev)=>{
      if(!ev.detail || !ev.detail.available) return;
      try{
        FG_DB.collection(FG_CONFIG.HELP_COLLECTION || 'helpRequests').where('status','==','open').onSnapshot(snap=>{
          snap.docChanges().forEach(ch=>{
            if(ch.type === 'added'){
              const d = ch.doc.data();
              window.dispatchEvent(new CustomEvent('fg:help-request', {detail: Object.assign({id: ch.doc.id}, d)}));
            }
          });
        });
      }catch(e){ }
    });
  });
})();
