import React, { useState, useEffect } from 'react';
import './PlaylistModal.css'; // Import the CSS for styling

const PlaylistModal = ({ isOpen, onClose, onSubmit, defaultPlaylistName }) => {
  // const [playlistName, setPlaylistName] = useState(defaultPlaylistName);
  const [playlistName, setPlaylistName] = useState(defaultPlaylistName);

  useEffect(() => {
    setPlaylistName(defaultPlaylistName);
  }, [defaultPlaylistName, isOpen]);

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
        <h2>Create Playlist</h2>
        <p className="modal-sub">Name your new Spotify playlist</p>
        <input
          type="text"
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          placeholder="My Top Tracks"
          className="playlist-name-input"
          autoFocus
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