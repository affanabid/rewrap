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
from dotenv import load_dotenv
import sys
from pathlib import Path

# Ensure root workspace directory is in sys.path to access automation module
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

try:
    from automation.spotify_user_manager import flask_add_user
    from automation.notifier import notify_user_added
except ImportError:
    flask_add_user = None
    notify_user_added = None

backend_env = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=backend_env)
load_dotenv()

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

# CORS(app, origins=os.getenv("FRONTEND_URL", "https://rewrap-puce.vercel.app"), supports_credentials=True)
# CORS(app, origins="https://rewrap-puce.vercel.app", supports_credentials=True)
# CORS(app, origins="http://127.0.0.1:5173", supports_credentials=True)
CORS(app, origins=[FRONTEND_URL, "https://rewrap-puce.vercel.app", "http://127.0.0.1:5173", "http://localhost:5173"], supports_credentials=True)

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
    client_id = os.getenv("SPOTIPY_CLIENT_ID")
    client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")
    redirect_uri = os.getenv("SPOTIPY_REDIRECT_URI", "http://127.0.0.1:5000/callback")

    if not client_id or not client_secret:
        raise ValueError(
            "Missing Spotify API credentials. Please set SPOTIPY_CLIENT_ID and SPOTIPY_CLIENT_SECRET in backend/.env"
        )

    return SpotifyOAuth(client_id=client_id,
                        client_secret=client_secret,
                        redirect_uri=redirect_uri,
                        scope=scope,
                        cache_handler=NullCache(),
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
    try:
        sp_oauth = get_spotify_oauth()
        auth_url = sp_oauth.get_authorize_url()
        return redirect(auth_url)
    except ValueError as ve:
        app.logger.error(f"Login failed: {ve}")
        return jsonify({
            "error": "Missing Spotify API Credentials",
            "message": str(ve),
            "instructions": "Please copy backend/.env.example to backend/.env and populate SPOTIPY_CLIENT_ID, SPOTIPY_CLIENT_SECRET, and SPOTIPY_REDIRECT_URI."
        }), 500

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

@app.route("/recommendations", methods=['GET'])
def get_recommendations():
    token_info = get_spotify_token()
    if not token_info:
        return jsonify({"error": "Unauthorized"}), 401

    sp = spotipy.Spotify(auth=token_info['access_token'])
    time_range = request.args.get('time_range', 'short_term')

    try:
        top_artists = sp.current_user_top_artists(limit=5, time_range=time_range).get('items', [])
        top_tracks = sp.current_user_top_tracks(limit=5, time_range=time_range).get('items', [])

        if not top_artists and not top_tracks:
            top_artists = sp.current_user_top_artists(limit=5, time_range='medium_term').get('items', [])
            top_tracks = sp.current_user_top_tracks(limit=5, time_range='medium_term').get('items', [])

        if not top_artists and not top_tracks:
            top_artists = sp.current_user_top_artists(limit=5, time_range='long_term').get('items', [])
            top_tracks = sp.current_user_top_tracks(limit=5, time_range='long_term').get('items', [])

        seed_artists = [a['id'] for a in top_artists[:2]] if top_artists else []
        seed_tracks = [t['id'] for t in top_tracks[:2]] if top_tracks else []

        # Tier 1: Spotify Recommendations API
        try:
            if seed_artists or seed_tracks:
                recs = sp.recommendations(
                    seed_artists=seed_artists if seed_artists else None,
                    seed_tracks=seed_tracks if seed_tracks else None,
                    limit=12
                )
                if recs and recs.get('tracks'):
                    return jsonify({"items": recs.get('tracks')}), 200
        except Exception as seed_err:
            app.logger.warning(f"Spotify recommendations API notice: {seed_err}")

        # Tier 2: Related Artists Top Tracks Algorithm
        recommended_tracks = []
        user_top_track_ids = {t['id'] for t in top_tracks}

        if top_artists:
            for artist in top_artists[:4]:
                try:
                    related = sp.artist_related_artists(artist['id']).get('artists', [])
                    for rel_artist in related[:4]:
                        rel_tracks = sp.artist_top_tracks(rel_artist['id']).get('tracks', [])
                        # Sort so tracks with 30s audio preview_url are prioritized
                        rel_tracks.sort(key=lambda tr: 0 if tr.get('preview_url') else 1)
                        for t in rel_tracks:
                            if t['id'] not in user_top_track_ids and not any(r['id'] == t['id'] for r in recommended_tracks):
                                recommended_tracks.append(t)
                                if len(recommended_tracks) >= 12:
                                    break
                        if len(recommended_tracks) >= 12:
                            break
                except Exception as rel_err:
                    app.logger.warning(f"Related artists fetch error: {rel_err}")

                if len(recommended_tracks) >= 12:
                    break

        # Tier 3: Search Fallback
        if len(recommended_tracks) < 12:
            try:
                search_results = sp.search(q='year:2024-2025', type='track', limit=12)
                for t in search_results.get('tracks', {}).get('items', []):
                    if not any(r['id'] == t['id'] for r in recommended_tracks):
                        recommended_tracks.append(t)
                        if len(recommended_tracks) >= 12:
                            break
            except Exception as search_err:
                app.logger.warning(f"Search fallback error: {search_err}")

        return jsonify({"items": recommended_tracks[:12]}), 200

    except Exception as e:
        app.logger.error(f"Error fetching recommendations: {e}")
        return jsonify({"error": str(e)}), 500




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

@app.route("/register-spotify-user", methods=["POST"])
def register_spotify_user():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()

    if not name or not email:
        return jsonify({"error": "Both Name and Email are required."}), 400

    # Try Playwright automation first
    automation_success = False
    removed_user = None

    if flask_add_user:
        try:
            result = flask_add_user(name=name, email=email)
            if result.get("success"):
                automation_success = True
                removed_user = result.get("removed_user")
        except Exception as e:
            app.logger.warning(f"Automation notice: {e}")

    # Always notify admin via email
    if notify_user_added:
        try:
            notify_user_added(name=name, email=email, removed_email=removed_user)
        except Exception as n_err:
            app.logger.warning(f"Failed to send notification email: {n_err}")

    if automation_success:
        return jsonify({
            "success": True,
            "message": f"Registration complete! Access granted for {email}.",
            "removed_user": removed_user
        }), 200
    else:
        return jsonify({
            "success": True,
            "message": f"Access request received for {email}. Your account will be enabled shortly.",
            "removed_user": None
        }), 200



if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
