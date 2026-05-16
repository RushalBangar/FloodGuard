from flask import Blueprint, request, jsonify
import time
from .sockets import broadcast
from .firebase_config import db, firebase_initialized
from .notifier import send_push_notification
from .predictor import calculate_flood_risk, calculate_quake_risk, calculate_fire_risk

api_bp = Blueprint('sensor_api', __name__)

@api_bp.route('/sensor-data', methods=['POST'])
def receive_sensor_data():
    try:
        obj = request.get_json()
        if not obj:
            return jsonify({'error': 'No data received'}), 400

        disaster_type = obj.get('disaster', 'flood')
        print(f"[API] Received {disaster_type.upper()} data via HTTP from {obj.get('node_id')}")

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
                float(obj.get('gas_ppm', 0)),
                float(obj.get('temperature', 25)),
                float(obj.get('humidity', 50)),
                obj.get('flame_detected', False)
            ))

        # Broadcast to all connected WebSocket clients (the browser)
        result['disaster'] = disaster_type
        result['raw_data'] = obj
        result['timestamp'] = time.time()
        broadcast(result)

        # Save to Firestore
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

        return jsonify({'status': 'success', 'processed': True}), 200

    except Exception as e:
        print(f"API Error: {e}")
        return jsonify({'error': str(e)}), 500
