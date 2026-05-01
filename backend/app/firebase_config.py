import os
import firebase_admin
from firebase_admin import credentials, firestore

db = None
firebase_initialized = False

def initialize_firebase():
    global db, firebase_initialized
    try:
        # 1. Try loading from environment variable (preferred for production/Render)
        svc_json = os.environ.get('SERVICE_ACCOUNT_JSON')
        if svc_json:
            import json
            cred_dict = json.loads(svc_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            firebase_initialized = True
            print('Firebase Admin initialized via environment variable.')
            return

        # 2. Fallback to local file
        svc_path = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
        if os.path.exists(svc_path):
            cred = credentials.Certificate(svc_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            firebase_initialized = True
            print('Firebase Admin initialized via serviceAccountKey.json.')
        else:
            print('No Firebase credentials found (env or file) — running without Firebase.')
    except Exception as e:
        print(f'Firebase Admin initialization failed: {e}')

# Initialize on module load
initialize_firebase()
