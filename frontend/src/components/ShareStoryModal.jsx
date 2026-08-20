import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import WrappedStoryCard from './WrappedStoryCard';
import './ShareStoryModal.css';

function ShareStoryModal({ isOpen, onClose, user, topArtists, topTracks, genreDistribution, timeRange }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  // Dynamic Customizer Limits
  const [artistLimit, setArtistLimit] = useState(1);
  const [trackLimit, setTrackLimit] = useState(5);
  const [genreLimit, setGenreLimit] = useState(3);
  const [showUserBadge, setShowUserBadge] = useState(true);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setDownloading(true);
    setDownloadError('');

    try {
      // Convert HTML element to PNG with 2x resolution for high sharpness
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.95,
      });

      // Create temporary anchor to trigger automatic file download
      const link = document.createElement('a');
      link.download = `spotify-rewrapped-${timeRange || 'story'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate story image:', err);
      setDownloadError('Could not generate image due to CORS restrictions. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-story-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} disabled={downloading}>
          &times;
        </button>

        <div className="share-modal-header">
          <h2>Export Story Card</h2>
          <p>Customize your card & export to Instagram, Twitter, or TikTok Stories!</p>
        </div>

        {downloadError && <div className="share-error">{downloadError}</div>}

        {/* Card Customizer Controls Panel */}
        <div className="card-customizer-panel">
          <div className="customizer-group">
            <span className="customizer-label">Artists:</span>
            <div className="pill-group">
              {[1, 3, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`customizer-pill ${artistLimit === num ? 'active' : ''}`}
                  onClick={() => setArtistLimit(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="customizer-group">
            <span className="customizer-label">Songs:</span>
            <div className="pill-group">
              {[3, 5, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`customizer-pill ${trackLimit === num ? 'active' : ''}`}
                  onClick={() => setTrackLimit(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="customizer-group">
            <span className="customizer-label">Genres:</span>
            <div className="pill-group">
              {[0, 3, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`customizer-pill ${genreLimit === num ? 'active' : ''}`}
                  onClick={() => setGenreLimit(num)}
                >
                  {num === 0 ? 'Off' : num}
                </button>
              ))}
            </div>
          </div>

          <div className="customizer-group">
            <button
              type="button"
              className={`customizer-toggle-btn ${showUserBadge ? 'active' : ''}`}
              onClick={() => setShowUserBadge(!showUserBadge)}
            >
              {showUserBadge ? '👤 Profile Visible' : '👤 Profile Hidden'}
            </button>
          </div>
        </div>

        {/* Live Story Card Preview */}
        <div className="story-card-preview-container">
          <WrappedStoryCard
            user={user}
            topArtists={topArtists}
            topTracks={topTracks}
            genreDistribution={genreDistribution}
            timeRange={timeRange}
            cardRef={cardRef}
            artistLimit={artistLimit}
            trackLimit={trackLimit}
            genreLimit={genreLimit}
            showUserBadge={showUserBadge}
          />
        </div>

        {/* Action Controls */}
        <div className="share-modal-actions">
          <button className="download-story-btn" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <span className="spinner-container">
                <span className="spinner"></span> Generating PNG Card...
              </span>
            ) : (
              '📥 Download Story Card (.PNG)'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareStoryModal;

