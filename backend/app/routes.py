import os
from flask import Blueprint, send_from_directory, request, jsonify, current_app
from .firebase_config import db, firebase_initialized
from .predictor import calculate_flood_risk
from .notifier import send_sms_alert
import requests

api = Blueprint('api', __name__)

@api.route('/api/alert', methods=['POST'])
def api_alert():
    from .sockets import broadcast
    import time
    data = request.get_json() or {}
    msg = data.get('message', 'Flood alert')
    
    # Save to Firestore if available
    if firebase_initialized and db:
        try:
            db.collection('alerts').add({
                'message': msg,
                'timestamp': time.time(),
                'type': 'alert'
            })
        except Exception as e:
            print(f"Error saving alert to Firestore: {e}")

    broadcast({'type': 'alert', 'message': msg})
    return jsonify({'ok': True})

@api.route('/api/locations', methods=['GET'])
def api_locations():
    if firebase_initialized and db:
        try:
            docs = db.collection('locations').stream()
            out = []
            for d in docs:
                item = d.to_dict()
                item['id'] = d.id
                out.append(item)
            return jsonify(out)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify([])

@api.route('/api/predict', methods=['POST'])
def api_predict():
    data = request.get_json() or {}
    water_level = float(data.get('water_level', 0))
    rainfall = float(data.get('rainfall', 0))
    hum = float(data.get('humidity', 50))
    temp = float(data.get('temperature', 25))
    
    result = calculate_flood_risk(water_level, rainfall, hum, temp)
    return jsonify(result)

@api.route('/api/weather', methods=['GET'])
def api_weather():
    api_key = os.environ.get('WEATHER_API_KEY')
    lat = request.args.get('lat', '20.0')
    lon = request.args.get('lon', '78.0')
    
    if api_key:
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
            resp = requests.get(url)
            return jsonify(resp.json())
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    # Mock fallback
    return jsonify({
        "main": {"temp": 28, "humidity": 65},
        "weather": [{"main": "Clouds", "description": "scattered clouds"}],
        "wind": {"speed": 4.1}
    })

@api.route('/api/simulate', methods=['POST'])
def api_simulate():
    data = request.get_json() or {}
    from .sockets import broadcast
    broadcast({
        "type": "simulation",
        "water_level": data.get('water_level'),
        "rainfall": data.get('rainfall'),
        "humidity": data.get('humidity'),
        "temperature": data.get('temperature')
    })
    return jsonify({"status": "Simulation broadcasted"})

@api.route('/api/notify', methods=['POST'])
def api_notify():
    data = request.get_json() or {}
    msg = data.get('message', 'Flood Alert')
    phone = data.get('phone')
    if not phone:
        return jsonify({"error": "Phone number required"}), 400
    
    success = send_sms_alert(msg, phone)
    return jsonify({"ok": success})

@api.route('/api/health', methods=['GET'])
def api_health():
    return jsonify({"status": "ok", "firebase": firebase_initialized})

@api.route('/api/sos', methods=['POST'])
def api_sos():
    """REST API fallback for sending SOS when WebSocket is not connected"""
    from .sockets import broadcast, active_sos
    import time, uuid
    data = request.get_json() or {}
    lat = data.get('lat')
    lng = data.get('lng')
    name = data.get('name', 'Anonymous')
    
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400
    
    sos_id = uuid.uuid4().hex[:8]
    now = time.time()
    msg = {
        'type': 'location',
        'id': sos_id,
        'lat': float(lat),
        'lng': float(lng),
        'isSOS': True,
        'name': name,
        'timestamp': now
    }
    
    # Save to Firestore if available
    if firebase_initialized and db:
        try:
            db.collection('helpRequests').document(sos_id).set({
                'name': name,
                'lat': float(lat),
                'lng': float(lng),
                'isSOS': True,
                'timestamp': now,
                'status': 'active'
            })
        except Exception as e:
            print(f"Error saving SOS to Firestore: {e}")

    active_sos[sos_id] = msg
    broadcast(msg)
    return jsonify({"ok": True, "id": sos_id})

@api.route('/api/sos', methods=['GET'])
def api_get_sos():
    """Get all active SOS signals"""
    from .sockets import active_sos
    return jsonify(list(active_sos.values()))

# Catch-all route to serve static files from the frontend directory (local dev only)
@api.route('/', defaults={'path': 'index.html'})
@api.route('/<path:path>')
def static_proxy(path):
    if current_app.static_folder:
        return send_from_directory(current_app.static_folder, path)
    return jsonify({"error": "Frontend not available on this server"}), 404
