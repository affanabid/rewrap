import React, { useState } from 'react';
import './PlaylistModal.css'; // Import the CSS for styling

const PlaylistModal = ({ isOpen, onClose, onSubmit, defaultPlaylistName }) => {
  const [playlistName, setPlaylistName] = useState(defaultPlaylistName);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (playlistName.trim()) {
      onSubmit(playlistName);
    } else {
      alert("Playlist name cannot be empty!");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Playlist</h2>
        <input
          type="text"
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          placeholder="Enter playlist name"
          className="playlist-name-input"
        />
        <div className="modal-buttons">
          <button onClick={handleSubmit} className="modal-button primary">Create</button>
          <button onClick={onClose} className="modal-button secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistModal; 