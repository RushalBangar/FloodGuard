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
  });
})();
