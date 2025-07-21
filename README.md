# Spotify Re-Wrapped

[![Python 3.x](https://img.shields.io/badge/python-3.x-blue.svg)](https://www.python.org/downloads/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D%2014.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Backend:** Flask `3.1.1`  
> **Frontend:** React `19.1.0`

A modern web application that lets you log in with your Spotify account to view personalized music statistics and insights, inspired by Spotify Wrapped.

## 🌟 Features

- 🎵 **Spotify Authentication**
- 📈 **Personalized Music Insights**
- 🖥️ **Modern React Frontend**
- 🐍 **Python Backend API**
- 🚀 **Deployable to Vercel & Render**

## 🏗 Project Structure

```
rewrap/
├── backend/           
│   ├── app.py         
│   ├── requirements.txt
│   └── utils/         
├── frontend/          
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   ├── public/
│   └── package.json
└── README.md
```

## 🔧 Prerequisites

- **Python**: Version 3.x
- **Node.js**: Version 14.0.0 or higher

## 🚀 Setup Instructions

### Backend

1. **Navigate to backend**
   ```bash
   cd backend
   ```
2. **(Optional) Create virtual environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # macOS/Linux
   ```
3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the backend server**
   ```bash
   python app.py
   ```

### Frontend

1. **Navigate to frontend**
   ```bash
   cd frontend
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start the development server**
   ```bash
   npm run dev
   ```

## ⚙️ Environment Variables

- The frontend uses `VITE_API_BASE_URL` to configure the backend API URL. Create a `.env` file in `frontend`:
  ```env
  VITE_API_BASE_URL=http://localhost:5000
  ```

## 💡 Usage Guide

- Visit the frontend URL (default: [http://localhost:5173](http://localhost:5173))
- Click **Login with Spotify**
- Authorize the app and view your personalized stats

## 🛠️ Deployment

- **Backend:** https://rewrap.onrender.com
- **Frontend:** https://rewrap-puce.vercel.app

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for improvements.

---

