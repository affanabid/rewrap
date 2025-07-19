from flask import Flask, request, jsonify, session, redirect
from flask_cors import CORS
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import os
import time

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET", "supersecret")
CORS(app, origins=os.getenv("FRONTEND_URL"), supports_credentials=True)

# Configure environment variables before running
SPOTIPY_CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID")
SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET")
SPOTIPY_REDIRECT_URI = os.getenv("SPOTIPY_REDIRECT_URI", "http://127.0.0.1:5000/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")

scope = "user-top-read playlist-modify-public user-read-playback-state user-library-read"

def get_spotify_oauth():
    return SpotifyOAuth(client_id=SPOTIPY_CLIENT_ID,
                            client_secret=SPOTIPY_CLIENT_SECRET,
                            redirect_uri=SPOTIPY_REDIRECT_URI,
                            scope=scope)

def get_spotify_token():
    token_info = session.get("token_info", None)
    if not token_info:
        return None

    now = int(time.time())
    is_expired = token_info['expires_at'] - now < 60 # Check if token expires in less than 60 seconds

    if is_expired:
        sp_oauth = get_spotify_oauth()
        token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
        session["token_info"] = token_info # Update session with new token info

    return token_info

@app.route("/login")
def login():
    sp_oauth = get_spotify_oauth()
    auth_url = sp_oauth.get_authorize_url()
    return redirect(auth_url)

@app.route("/callback")
def callback():
    sp_oauth = get_spotify_oauth()
    code = request.args.get("code")
    token_info = sp_oauth.get_access_token(code)
    session["token_info"] = token_info
    return redirect(f"{FRONTEND_URL}/dashboard")

@app.route("/me")
def me():
    token_info = get_spotify_token()
    if not token_info:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        sp = spotipy.Spotify(auth=token_info['access_token'])
        user_profile = sp.current_user()
        return jsonify(user_profile)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/top-tracks")
def top_tracks():
    token_info = get_spotify_token()
    if not token_info:
        return jsonify({"error": "Unauthorized"}), 401
    time_range = request.args.get('time_range', 'short_term') # Get time_range from query params
    sp = spotipy.Spotify(auth=token_info['access_token'])
    results = sp.current_user_top_tracks(limit=20, time_range=time_range)
    return jsonify(results)

@app.route("/top-artists")
def top_artists():
    token_info = get_spotify_token()
    if not token_info:
        return jsonify({"error": "Unauthorized"}), 401
    time_range = request.args.get('time_range', 'short_term') # Get time_range from query params
    sp = spotipy.Spotify(auth=token_info['access_token'])
    results = sp.current_user_top_artists(limit=10, time_range=time_range) # Fetch top 10 artists
    return jsonify(results)

@app.route("/create-playlist", methods=['POST'])
def create_playlist():
    token_info = get_spotify_token()
    if not token_info:
        return jsonify({"error": "Unauthorized"}), 401

    sp = spotipy.Spotify(auth=token_info['access_token'])
    data = request.get_json()
    playlist_name = data.get('playlist_name', 'My Wrapped Playlist')
    track_uris = data.get('track_uris', [])

    if not track_uris:
        return jsonify({"error": "No tracks provided to create playlist"}), 400

    try:
        user_id = sp.current_user()['id']
        playlist = sp.user_playlist_create(user=user_id, name=playlist_name, public=True)
        sp.playlist_add_items(playlist_id=playlist['id'], items=track_uris)
        return jsonify({"message": "Playlist created successfully!", "playlist_url": playlist['external_urls']['spotify']}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)