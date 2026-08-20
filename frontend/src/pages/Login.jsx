// pages/Login.jsx
import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import RegisterModal from '../components/RegisterModal';

function Login() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
  };

  return (
    <div className="login-container">
      <div className="login-content">

        <h1>Spotify Re<span className="accent">Wrap</span></h1>
        <p>
          Uncover your real listening story — top artists, tracks, and
          genre insights from your Spotify history.
        </p>

        <div className="login-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
          <button className="login-button" onClick={handleLogin}>
            {/* Spotify icon */}
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Continue with Spotify
          </button>

          <button 
            type="button" 
            className="register-trigger-btn"
            onClick={() => setIsRegisterOpen(true)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#b3b3b3',
              padding: '10px 20px',
              borderRadius: '25px',
              fontSize: '0.88rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1ed760';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = '#b3b3b3';
            }}
          >
            ⚡ Need Access? Register Spotify Account
          </button>
        </div>

      </div>

      <RegisterModal 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)} 
        apiBaseUrl={API_BASE_URL}
      />

      <footer className="footer">
        <p>Built by Affan</p>
        <div className="footer-links">
          <a href="https://www.linkedin.com/in/affan-abid-91270b267/" target="_blank" rel="noopener noreferrer" className="footer-link">LinkedIn</a>
          <a href="https://github.com/affanabid" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
          <a href="mailto:affanabid31@gmail.com" className="footer-link">Email</a>
        </div>
      </footer>
    </div>
  );
}


export default Login;
