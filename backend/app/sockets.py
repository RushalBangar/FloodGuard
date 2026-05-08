import json
import uuid
import time
from flask import current_app as app
from . import sock
from .firebase_config import db, firebase_initialized
from .notifier import send_push_notification

clients = set()

# In-memory store for active SOS signals (used by REST API fallback)
active_sos = {}

def broadcast(obj):
    s = json.dumps(obj)
    for ws in list(clients):
        try:
            ws.send(s)
        except Exception:
            pass

@sock.route('/ws')
def websocket(ws):
    client_id = uuid.uuid4().hex[:8]
    clients.add(ws)
    try:
        ws.send(json.dumps({'type':'welcome', 'id': client_id}))
        
        # Send any existing active SOS signals to the newly connected client
        for sos_id, sos_data in active_sos.items():
            try:
                ws.send(json.dumps(sos_data))
            except Exception:
                pass
        
        while True:
            data = ws.receive()
            if data is None:
                break
            try:
                obj = json.loads(data)
            except Exception:
                continue

            if obj.get('type') == 'location':
                lat = obj.get('lat')
                lng = obj.get('lng')
                is_sos = obj.get('isSOS', False)
                name = obj.get('name', 'Anonymous')
                
                if firebase_initialized and db:
                    try:
                        doc_data = {'lat': lat, 'lng': lng, 'timestamp': time.time()}
                        if is_sos:
                            doc_data['isSOS'] = True
                            doc_data['name'] = name
                        db.collection('locations').document(client_id).set(doc_data)
                    except Exception as e:
                        print(f'Firebase write error: {e}')
                
                # Broadcast with ALL fields including isSOS and name
                msg = {
                    'type': 'location',
                    'id': client_id,
                    'lat': lat,
                    'lng': lng,
                    'isSOS': is_sos,
                    'name': name
                }
                broadcast(msg)
                
                # Store active SOS signals so new clients get them
                if is_sos:
                    active_sos[client_id] = msg
                    
            elif obj.get('type') == 'sensor_data':
                from .predictor import calculate_flood_risk
                water_level = float(obj.get('water_level', 0))
                rainfall = float(obj.get('rainfall', 0))
                humidity = float(obj.get('humidity', 50))
                temperature = float(obj.get('temperature', 25))
                
                result = calculate_flood_risk(water_level, rainfall, humidity, temperature)
                # Attach original data for broadcasting to other clients
                result['type'] = 'prediction'
                result['raw_data'] = {
                    'water_level': water_level,
                    'rainfall': rainfall,
                    'humidity': humidity,
                    'temperature': temperature
                }
                
                # Send prediction back to the sender
                ws.send(json.dumps(result))
                # Also broadcast to all other clients (dashboard)
                broadcast(result)

                # Trigger push notification if in Danger
                if result.get('status') == 'Danger':
                    send_push_notification("CRITICAL FLOOD ALERT", f"Risk level at {result['risk_percentage']}%. {result['recommendation']}")

            elif obj.get('type') == 'alert':
                broadcast({'type': 'alert', 'message': obj.get('message', 'Flood alert')})
    finally:
        clients.discard(ws)

