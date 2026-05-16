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
    print(f"[WS] Device connected! Client ID: {client_id}")
    try:
        ws.send(json.dumps({'type':'welcome', 'id': client_id}))
        
        # Send any existing active SOS signals to the newly connected client
        if firebase_initialized and db:
            try:
                active_docs = db.collection('helpRequests').where('status', '==', 'active').stream()
                for doc in active_docs:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    data['type'] = 'location'
                    ws.send(json.dumps(data))
            except Exception as e:
                print(f"Error syncing WS with Firestore: {e}")
        else:
            # Fallback for memory-only mode
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
                disaster_type = obj.get('disaster', 'flood')
                print(f"[WS] Received {disaster_type.upper()} data from {obj.get('node_id')}")
                from .predictor import calculate_flood_risk, calculate_quake_risk, calculate_fire_risk
                result = {'type': 'prediction', 'status': 'Normal', 'risk_percentage': 0}

                if disaster_type == 'flood':
                    result.update(calculate_flood_risk(
                        float(obj.get('water_level', 0)),
                        float(obj.get('rainfall', 0)),
                        float(obj.get('humidity', 50)),
                        float(obj.get('temperature', 25))
                    ))
                elif disaster_type == 'quake':
                    result.update(calculate_quake_risk(
                        float(obj.get('vib_x', 0)),
                        float(obj.get('vib_y', 0)),
                        float(obj.get('vib_z', 0)),
                        obj.get('shock_alert', False)
                    ))
                elif disaster_type == 'fire':
                    result.update(calculate_fire_risk(
                        float(obj.get('gas_raw', 0)),
                        float(obj.get('temperature', 25)),
                        float(obj.get('humidity', 50)),
                        obj.get('flame_detected', False)
                    ))

                # Broadcast result to all clients
                result['disaster'] = disaster_type
                result['raw_data'] = obj
                result['timestamp'] = time.time()
                broadcast(result)

                # Save to Firestore for the dashboard
                if firebase_initialized and db:
                    try:
                        collection_name = f"{disaster_type}_data"
                        db.collection(collection_name).add({
                            **obj,
                            'ai_risk_score': result['risk_percentage'],
                            'status': result['status'],
                            'timestamp': time.time()
                        })
                    except Exception as e:
                        print(f"Firestore Save Error: {e}")

                # Trigger push notification if in Danger
                if result.get('status') in ['Danger', 'Structural Threat', 'High Fire Risk']:
                    send_push_notification(f"CRITICAL {disaster_type.upper()} ALERT", f"Risk level at {result['risk_percentage']}%. Take immediate action.")

            elif obj.get('type') == 'resolve':
                sos_id = obj.get('id')
                if sos_id in active_sos:
                    del active_sos[sos_id]
                # Broadcast to all clients so they "refresh" instantly
                broadcast({'type': 'resolve', 'id': sos_id})

            elif obj.get('type') == 'alert':
                broadcast({'type': 'alert', 'message': obj.get('message', 'Flood alert')})
    finally:
        clients.discard(ws)

