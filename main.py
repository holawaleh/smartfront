from flask import Flask, request, jsonify, send_from_directory, send_file
import os
import time

app = Flask(__name__, static_folder='.', static_url_path='')

# === Serve HTML Pages ===
@app.route('/')
def home():
    return send_file('login.html')

@app.route('/<path:path>')
def static_files(path):
    if os.path.exists(path):
        return send_from_directory('.', path)
    else:
        return send_file('login.html')  # fallback

# === Login API ===
@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Dummy check - Replace with real DB logic
    if username == "admin" and password == "admin123":
        token = f"demo_token_{int(time.time())}"
        user = {"username": username, "role": "superadmin"}
        return jsonify({"token": token, "user": user}), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
