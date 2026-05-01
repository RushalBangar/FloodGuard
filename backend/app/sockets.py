import json
import uuid
from flask import current_app as app
from . import sock
from .firebase_config import db, firebase_initialized

clients = set()

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
                if firebase_initialized and db:
                    try:
                        db.collection('locations').document(client_id).set({'lat': lat, 'lng': lng})
                    except Exception as e:
                        print(f'Firebase write error: {e}')
                broadcast({'type': 'location', 'id': client_id, 'lat': lat, 'lng': lng})
            elif obj.get('type') == 'alert':
                broadcast({'type': 'alert', 'message': obj.get('message', 'Flood alert')})
    finally:
        clients.discard(ws)
