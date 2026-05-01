import os
from flask import Flask
from flask_sock import Sock

sock = Sock()

def create_app():
    # Define the frontend directory path (two levels up from this file)
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend'))
    
    app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
    
    # Initialize extensions
    sock.init_app(app)
    
    with app.app_context():
        # Import components
        from . import routes, sockets, firebase_config
        
        # Register components (sockets are registered via decorator, so they just need to be imported)
        # Routes are registered via @app.route in routes.py
        
        return app
