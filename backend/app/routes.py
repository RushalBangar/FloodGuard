import os
from flask import current_app as app, send_from_directory, request, jsonify
from .firebase_config import db, firebase_initialized
from .predictor import calculate_flood_risk
from .notifier import send_sms_alert
import requests

@app.route('/api/alert', methods=['POST'])
def api_alert():
    from .sockets import broadcast
    data = request.get_json() or {}
    msg = data.get('message', 'Flood alert')
    broadcast({'type': 'alert', 'message': msg})
    return jsonify({'ok': True})

@app.route('/api/locations', methods=['GET'])
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

@app.route('/api/predict', methods=['POST'])
def api_predict():
    data = request.get_json() or {}
    water_level = float(data.get('water_level', 0))
    rainfall = float(data.get('rainfall', 0))
    hum = float(data.get('humidity', 50))
    temp = float(data.get('temperature', 25))
    
    result = calculate_flood_risk(water_level, rainfall, hum, temp)
    return jsonify(result)

@app.route('/api/weather', methods=['GET'])
def api_weather():
    # Placeholder for real weather API integration
    # For now, return mock data or fetch from OpenWeather if API_KEY exists
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

@app.route('/api/simulate', methods=['POST'])
def api_simulate():
    data = request.get_json() or {}
    # Broadcast simulation data to all connected clients via WebSockets
    from .sockets import broadcast
    broadcast({
        "type": "simulation",
        "water_level": data.get('water_level'),
        "rainfall": data.get('rainfall'),
        "humidity": data.get('humidity'),
        "temperature": data.get('temperature')
    })
    return jsonify({"status": "Simulation broadcasted"})

@app.route('/api/notify', methods=['POST'])
def api_notify():
    data = request.get_json() or {}
    msg = data.get('message', 'Flood Alert')
    phone = data.get('phone')
    if not phone:
        return jsonify({"error": "Phone number required"}), 400
    
    success = send_sms_alert(msg, phone)
    return jsonify({"ok": success})

# Catch-all route to serve static files from the frontend directory (local dev only)
if app.static_folder:
    @app.route('/', defaults={'path': 'index.html'})
    @app.route('/<path:path>')
    def static_proxy(path):
        return send_from_directory(app.static_folder, path)
