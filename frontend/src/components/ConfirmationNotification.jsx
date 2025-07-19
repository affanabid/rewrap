import React from 'react';
import './ConfirmationNotification.css';

const ConfirmationNotification = ({ isOpen, message, playlistUrl, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="notification-overlay">
      <div className="notification-content">
        <p>{message}</p>
        <div className="notification-buttons">
          <button onClick={onConfirm} className="notification-button primary">Yes, View Playlist</button>
          <button onClick={onCancel} className="notification-button secondary">No, Stay Here</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationNotification; 