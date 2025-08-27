#app.py

from flask import Flask, request, jsonify, session, redirect
from flask_cors import CORS
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import os
import time
from collections import Counter
from flask_session import Session
from spotipy.cache_handler import CacheHandler

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET", "supersecret")

ENV = os.getenv("ENV", "dev")  # "dev" or "prod"

if ENV == "prod":
    app.config.update(
        SESSION_TYPE="filesystem",      # or "redis" if you prefer
        # SESSION_REDIS=redis.from_url(os.getenv("REDIS_URL")),  # if using Redis
        SESSION_PERMANENT=False,
        SESSION_COOKIE_NAME="rewrap_session",
        SESSION_COOKIE_SAMESITE="None",
        SESSION_COOKIE_SECURE=True,     # cookie only over HTTPS
    )
else:
    # local dev: do NOT force Secure cookies over http://localhost
    app.config.update(
        SESSION_TYPE="filesystem",
        SESSION_PERMANENT=False,
        SESSION_COOKIE_NAME="rewrap_session",
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=False,
    )

Session(app)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
# FRONTEND_URL = "http://127.0.0.1:5173"

# CORS(app, origins=os.getenv("FRONTEND_URL", "https://rewrap-puce.vercel.app"), supports_credentials=True)
# CORS(app, origins="https://rewrap-puce.vercel.app", supports_credentials=True)
# CORS(app, origins="http://127.0.0.1:5173", supports_credentials=True)
CORS(app, origins=[FRONTEND_URL], supports_credentials=True)

# Configure environment variables before running
SPOTIPY_CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID")
SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET")
SPOTIPY_REDIRECT_URI = os.getenv("SPOTIPY_REDIRECT_URI")
# SPOTIPY_REDIRECT_URI='https://rewrap.onrender.com/callback'
# SPOTIPY_REDIRECT_URI="http://127.0.0.1:5000/callback"

scope = "user-top-read playlist-modify-public user-read-playback-state user-library-read"

class NullCache(CacheHandler):
    def get_cached_token(self):
        return None
    def save_token_to_cache(self, token_info):
        pass

def get_spotify_oauth():
    return SpotifyOAuth(client_id=SPOTIPY_CLIENT_ID,
                            client_secret=SPOTIPY_CLIENT_SECRET,
                            redirect_uri=SPOTIPY_REDIRECT_URI,
                            scope=scope,
                            cache_handler=NullCache(),  # <— important
                            open_browser=False)

def get_spotify_token():
    token_info = session.get("token_info")
    if not token_info:
        return None

    now = int(time.time())
    is_expired = token_info['expires_at'] - now < 60
    if is_expired:
        sp_oauth = get_spotify_oauth()
        token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
        session["token_info"] = token_info  # stays per-user

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
    time_range = request.args.get('time_range', 'short_term') 
    sp = spotipy.Spotify(auth=token_info['access_token'])
    results = sp.current_user_top_tracks(limit=20, time_range=time_range)
    return jsonify(results)

@app.route("/top-artists")
def top_artists():
    token_info = get_spotify_token()
    if not token_info:
        return jsonify({"error": "Unauthorized"}), 401
    time_range = request.args.get('time_range', 'short_term') 
    sp = spotipy.Spotify(auth=token_info['access_token'])
    results = sp.current_user_top_artists(limit=10, time_range=time_range) 
    # return jsonify(results)

    genre_counter = Counter()
    for artist in results['items']:
        genre_counter.update(artist['genres'])

    genre_data = [{"genre": genre, "count": count} for genre, count in genre_counter.most_common()]

    return jsonify({
        "artists": results['items'],
        "genre_distribution": genre_data
    })

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
    
@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return "", 204


if __name__ == '__main__':
    app.run(debug=True)
