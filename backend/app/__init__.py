import os
from flask import Flask
from flask_cors import CORS
from flask_sock import Sock

sock = Sock()

def create_app():
    # On Render, rootDir is 'backend', so '../../frontend' won't exist.
    # The frontend is served by Vercel; Flask only needs to serve the API.
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend'))
    
    if os.path.isdir(frontend_dir):
        app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
    else:
        app = Flask(__name__)
    
    # Allow cross-origin requests from the Vercel frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Initialize extensions
    sock.init_app(app)
    
    # Import and register components
    from . import firebase_config, sockets
    from .routes import api
    app.register_blueprint(api)
    
    return app
