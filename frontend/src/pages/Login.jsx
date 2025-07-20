// pages/Login.jsx
import React from 'react';
// import './Login.css';

// const API_BASE_URL = 'https://rewrap.onrender.com';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://rewrap.onrender.com';

function Login() {
  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
  };

  return (
    <div className="auth-section">
      <h1>Spotify Wrapped on Demand</h1>
      <button onClick={handleLogin}>Login with Spotify</button>
    </div>
  );
}

export default Login;
