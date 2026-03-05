from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import urllib.parse

app = Flask(__name__)
# This allows your React frontend (localhost:3000) to talk to this Python backend safely
CORS(app) 

# YOUR SECRET KEY IS NOW HIDDEN ON THE SERVER!
API_KEY = "AIzaSyBhdhWdz1AJqCePuTeXf-6wrsC8LGhHH98" 

@app.route('/api/audit', methods=['GET'])
def audit_website():
    # 1. Get the URL sent by React
    target_url = request.args.get('url')
    
    if not target_url:
        return jsonify({"error": "No URL provided"}), 400

    print(f"🕵️ Running deep scan on: {target_url}")

    # 2. Build the Google API request securely on the backend
    encoded_url = urllib.parse.quote(target_url)
    google_api_url = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={encoded_url}&category=performance&category=seo&category=accessibility&category=best-practices&key={API_KEY}"

    try:
        # 3. Ask Google for the data
        response = requests.get(google_api_url)
        data = response.json()
        
        # 4. Send the data back to React
        return jsonify(data)
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Failed to fetch data from Google API"}), 500

if __name__ == '__main__':
    # Start the server on port 5000
    print("🚀 Backend Server is running on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)