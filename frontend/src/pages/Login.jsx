// pages/Login.jsx
import React from 'react';
import { API_BASE_URL } from '../config';
// import './Login.css';

// const API_BASE_URL = 'https://rewrap.onrender.com';
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://rewrap.onrender.com';
// const API_BASE_URL = 'http://127.0.0.1:5000';

function Login() {
  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
  };

  return (
    <div className="auth-section">
      <h1>Spotify Re-Wrapped</h1>
      <button onClick={handleLogin}>Login with Spotify</button>
    </div>
  );
}

export default Login;
