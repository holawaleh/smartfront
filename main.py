from flask import Flask, send_from_directory, send_file
import os

# Create the Flask app
app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)