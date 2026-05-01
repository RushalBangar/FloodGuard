import os
import json
import uuid
from flask import Flask, send_from_directory, request, jsonify
from flask_sock import Sock

# Serve frontend static files from the frontend folder at repo root
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'frontend'))
app = Flask(__name__, static_folder=PROJECT_ROOT)
sock = Sock(app)

# Optional: initialize Firebase Admin if service account exists
firebase_initialized = False
try:
    from firebase_admin import credentials, initialize_app, firestore
    svc_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
    if os.path.exists(svc_path):
        cred = credentials.Certificate(svc_path)
        initialize_app(cred)
        db = firestore.client()
        firebase_initialized = True
        print('Firebase Admin initialized.')
    else:
        print('No serviceAccountKey.json found — running without Firebase.')
except Exception as e:
    print('Firebase Admin not available:', e)

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
                if firebase_initialized:
                    try:
                        db.collection('locations').document(client_id).set({'lat': lat, 'lng': lng})
                    except Exception as e:
                        print('Firebase write error', e)
                broadcast({'type': 'location', 'id': client_id, 'lat': lat, 'lng': lng})
            elif obj.get('type') == 'alert':
                broadcast({'type': 'alert', 'message': obj.get('message', 'Flood alert')})
    finally:
        clients.discard(ws)


@app.route('/api/alert', methods=['POST'])
def api_alert():
    data = request.get_json() or {}
    msg = data.get('message', 'Flood alert')
    broadcast({'type': 'alert', 'message': msg})
    return jsonify({'ok': True})


@app.route('/api/locations', methods=['GET'])
def api_locations():
    if firebase_initialized:
        try:
            docs = db.collection('locations').stream()
            out = []
            for d in docs:
                item = d.to_dict(); item['id'] = d.id; out.append(item)
            return jsonify(out)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify([])


@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory(PROJECT_ROOT, path)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print('Starting FloodGuard Python server on port', port)
    app.run(host='0.0.0.0', port=port, debug=True)
