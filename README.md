# Spotify ReWrap

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1.1-black.svg?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646CFF.svg?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Spotify API](https://img.shields.io/badge/Spotify-Web%20API-1DB954.svg?style=flat-square&logo=spotify&logoColor=white)](https://developer.spotify.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Spotify ReWrap is a web application that provides listening analytics, personalized recommendations, and story card exports based on user listening history. Built with a Flask REST API backend and a React (Vite) frontend, the platform integrates directly with the Spotify Web API.

---

## Technical Stack

- **Frontend**: React 19, Vite, React Router, Recharts, HTML5 Canvas, Vanilla CSS3
- **Backend**: Python 3.11+, Flask, Spotipy, Playwright, Gunicorn
- **Authentication**: Spotify OAuth 2.0 Authorization Code Flow
- **Deployment**: Vercel (Frontend), Render / Railway / Fly.io (Backend)

---

## Core System Architecture

```
rewrap/
├── backend/
│   ├── app.py                      # Core Flask API routes & OAuth handlers
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Container definition for Linux deployment
│   ├── fly.toml                    # Deployment config for Fly.io
│   └── automation/
│       ├── spotify_user_manager.py # Playwright headless dashboard automation
│       └── notifier.py             # Access request notifications
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI & Modal components
│   │   ├── pages/                  # Dashboard, Discover, Login routes
│   │   ├── App.jsx                 # Client router
│   │   └── config.js               # API environment configuration
│   ├── public/                     # Static assets & custom favicon
│   └── package.json                # Node dependencies
└── README.md
```

---

## Features

### 1. Analytics Dashboard
- **Listening Metrics**: Displays total listening duration, top played track, top artist, and top genre across selectable time ranges (4 weeks, 6 months, all-time).
- **Data Visualizations**: Interactive bar charts for track repeat counts and donut charts for genre spectrum breakdown powered by Recharts.
- **Exportable Story Cards**: Generates downloadable, social-shareable image cards using HTML5 Canvas.

### 2. Smart Music Discoveries
- **3-Tier Recommendation Engine**: Curates 12 personalized track recommendations utilizing Spotify API fallback layers (Recommendations API -> Artist Related Tracks -> Query Search).
- **30-Second Audio Previews**: Integrated audio player allowing instant preview playback.
- **1-Click Playlist Export**: Creates custom playlists directly in the user's Spotify account.

### 3. Automated Developer User Registration
- **Playwright Browser Automation**: Automates adding new user emails to the Spotify Developer Dashboard User Management whitelist.
- **Quota Management**: Automatically handles Spotify's 5-user development limit by evicting inactive test accounts when full.
- **Session Persistence**: Utilizes long-lived session cookie injection to bypass automated security challenges.

---

## Prerequisites

Before running the application locally, ensure you have the following installed:

- **Python**: Version 3.11 or higher
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **Spotify Developer Account**: Required to obtain Client ID and Client Secret

---

## Environment Configuration

### Backend Configuration (`backend/.env`)

Create a `.env` file in the `backend/` directory with the following variables:

```env
SPOTIPY_CLIENT_ID=your_spotify_client_id
SPOTIPY_CLIENT_SECRET=your_spotify_client_secret
SPOTIPY_REDIRECT_URI=http://127.0.0.1:5000/callback
FLASK_SECRET=your_flask_session_secret
FRONTEND_URL=http://127.0.0.1:5173
ENV=dev

# Optional: Automated User Registration Session
SPOTIFY_SP_DC=your_spotify_sp_dc_cookie
SPOTIFY_DEV_EMAIL=your_developer_email
SPOTIFY_DEV_PASSWORD=your_developer_password

# Optional: Admin Email Notifications
NOTIFY_SENDER_EMAIL=your_gmail_address@gmail.com
NOTIFY_SENDER_PASSWORD=your_gmail_app_password
NOTIFY_RECIPIENT_EMAIL=your_admin_email@gmail.com
```

### Frontend Configuration (`frontend/.env`)

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

---

## Local Setup and Development

### 1. Clone the Repository

```bash
git clone https://github.com/affanabid/rewrap.git
cd rewrap
```

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate

   # Windows
   python -m venv venv
   venv\Scripts\activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Install Playwright browser binaries:
   ```bash
   python -m playwright install chromium
   ```

5. Start the Flask backend server:
   ```bash
   python app.py
   ```
   The backend API will run on `http://127.0.0.1:5000`.

### 3. Frontend Setup

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend application will run on `http://127.0.0.1:5173`.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/login` | GET | Initiates Spotify OAuth authorization redirect |
| `/callback` | GET | Handles OAuth callback and session exchange |
| `/me` | GET | Returns authenticated Spotify user profile |
| `/top-artists` | GET | Fetches user top artists and genre distribution |
| `/top-tracks` | GET | Fetches user top tracks and audio metadata |
| `/recommendations` | GET | Returns curated 12-track discovery list |
| `/create-playlist` | POST | Creates a new playlist on the user's Spotify account |
| `/register-spotify-user` | POST | Triggers Playwright automation to whitelist user email |
| `/logout` | POST | Clears session data |

---

## Production Deployment

### Backend Deployment (Render / Railway / Fly.io)

1. Set the root working directory to `backend`.
2. Configure Environment Variables as specified in `backend/.env`.
3. Set the build command:
   ```bash
   pip install -r requirements.txt && python -m playwright install chromium
   ```
4. Set the start command:
   ```bash
   gunicorn --timeout 120 --bind 0.0.0.0:10000 app:app
   ```

### Spotify Developer Dashboard Redirect URIs

Ensure your production backend callback URL is registered under Redirect URIs in your Spotify Developer App settings:

`https://your-production-backend.com/callback`

---

## License

This project is licensed under the MIT License.
