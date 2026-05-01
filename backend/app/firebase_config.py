import os
import firebase_admin
from firebase_admin import credentials, firestore

db = None
firebase_initialized = False

def initialize_firebase():
    global db, firebase_initialized
    try:
        # Path to the service account key (at backend root)
        svc_path = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
        
        if os.path.exists(svc_path):
            cred = credentials.Certificate(svc_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            firebase_initialized = True
            print('Firebase Admin initialized successfully.')
        else:
            print('No serviceAccountKey.json found — running without Firebase.')
    except Exception as e:
        print(f'Firebase Admin initialization failed: {e}')

# Initialize on module load
initialize_firebase()
