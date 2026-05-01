import os
from flask import current_app as app, send_from_directory, request, jsonify
from .firebase_config import db, firebase_initialized

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

# Catch-all route to serve static files from the frontend directory
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory(app.static_folder, path)
