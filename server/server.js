const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

// Serve static site (parent folder)
app.use(express.static(path.join(__dirname, '..')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const locations = {}; // clientId -> {lat,lng,ts}

function broadcast(obj){
  const s = JSON.stringify(obj);
  wss.clients.forEach(c=>{ if(c.readyState === WebSocket.OPEN) c.send(s); });
}

wss.on('connection', (ws)=>{
  ws.id = Math.random().toString(36).slice(2,9);
  console.log('ws connected', ws.id);

  ws.on('message', (msg)=>{
    try{
      const data = JSON.parse(msg);
      if(data.type === 'location'){
        locations[ws.id] = {id: ws.id, lat: data.lat, lng: data.lng, ts: Date.now()};
        broadcast({type:'location', id: ws.id, lat: data.lat, lng: data.lng, ts: locations[ws.id].ts});
      } else if(data.type === 'alert'){
        broadcast({type:'alert', message: data.message || 'Flood alert'});
      }
    }catch(e){ console.warn('invalid message', e); }
  });

  ws.on('close', ()=>{ delete locations[ws.id]; });
  ws.send(JSON.stringify({type:'welcome', id: ws.id}));
});

app.post('/api/alert', (req,res)=>{
  const message = (req.body && req.body.message) || 'Flood alert';
  broadcast({type:'alert', message});
  res.json({ok:true});
});

app.get('/api/locations', (req,res)=>{
  res.json(Object.values(locations));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('FloodGuard server running at http://localhost:'+PORT));
