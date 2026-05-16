import threading
from .firebase_config import db, firebase_initialized
from .predictor import calculate_flood_risk, calculate_quake_risk, calculate_fire_risk

def on_flood_snapshot(col_snapshot, changes, read_time):
    for change in changes:
        if change.type.name in ['ADDED', 'MODIFIED']:
            doc = change.document
            data = doc.to_dict()
            if 'ai_risk_score' not in data: # Only calculate if not already calculated to avoid loops
                w = float(data.get('water_level', 0))
                r = float(data.get('rainfall', 0))
                h = float(data.get('humidity', 50))
                t = float(data.get('temperature', 25))
                result = calculate_flood_risk(w, r, h, t)
                try:
                    doc.reference.update({'ai_risk_score': result['risk_percentage'], 'ai_status': result['status']})
                except Exception as e:
                    print(f"Error updating flood_data: {e}")

def on_quake_snapshot(col_snapshot, changes, read_time):
    for change in changes:
        if change.type.name in ['ADDED', 'MODIFIED']:
            doc = change.document
            data = doc.to_dict()
            if 'ai_risk_score' not in data:
                x = float(data.get('vib_x', 0))
                y = float(data.get('vib_y', 0))
                z = float(data.get('vib_z', 0))
                shock = bool(data.get('shock_alert', False))
                result = calculate_quake_risk(x, y, z, shock)
                try:
                    doc.reference.update({'ai_risk_score': result['risk_percentage'], 'ai_status': result['status']})
                except Exception as e:
                    print(f"Error updating quake_data: {e}")

def on_fire_snapshot(col_snapshot, changes, read_time):
    for change in changes:
        if change.type.name in ['ADDED', 'MODIFIED']:
            doc = change.document
            data = doc.to_dict()
            if 'ai_risk_score' not in data:
                # Check for both raw and ppm keys for backwards compatibility
                gas = float(data.get('gas_raw', data.get('gas_ppm', 0)))
                t = float(data.get('temperature', 25))
                h = float(data.get('humidity', 50))
                flame = bool(data.get('flame_detected', False))
                result = calculate_fire_risk(gas, t, h, flame)
                try:
                    doc.reference.update({'ai_risk_score': result['risk_percentage'], 'ai_status': result['status']})
                except Exception as e:
                    print(f"Error updating fire_data: {e}")

def start_listeners():
    if not firebase_initialized or not db:
        print("Firebase not initialized. Listeners will not start.")
        return

    print("Starting AI Firebase listeners for Flood, Quake, and Fire data...")
    try:
        flood_ref = db.collection('flood_data')
        flood_watch = flood_ref.on_snapshot(on_flood_snapshot)

        quake_ref = db.collection('quake_data')
        quake_watch = quake_ref.on_snapshot(on_quake_snapshot)

        fire_ref = db.collection('fire_data')
        fire_watch = fire_ref.on_snapshot(on_fire_snapshot)
    except Exception as e:
        print(f"Error setting up Firebase listeners: {e}")

def start_background_thread():
    thread = threading.Thread(target=start_listeners)
    thread.daemon = True
    thread.start()
