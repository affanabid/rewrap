import React from 'react';
import ReactDOM from 'react-dom';
import './ConfirmationNotification.css';

const ConfirmationNotification = ({ isOpen, message, playlistUrl, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="notification-overlay" onClick={onCancel}>
      <div className="notification-content" onClick={(e) => e.stopPropagation()}>
        <div className="notification-icon-wrapper">
          <span className="notification-check-icon">✓</span>
        </div>

        <h3 className="notification-title">Playlist Created!</h3>
        <p className="notification-message">{message || 'Your playlist has been saved to your Spotify library.'}</p>

        <div className="notification-buttons">
          <button onClick={onConfirm} className="notification-button primary">
            View on Spotify
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '5px', display: 'inline-block', verticalAlign: 'middle' }}>
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </button>
          <button onClick={onCancel} className="notification-button secondary">
            Stay Here
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationNotification;