import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import PlaylistModal from '../components/PlaylistModal';
import ConfirmationNotification from '../components/ConfirmationNotification';
import CustomDropdown from '../components/CustomDropdown';
import { API_BASE_URL } from '../config';
import './Discover.css';

function Discover() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState('short_term');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, message: '', playlistUrl: '' });

  const audioRef = useRef(new Audio());

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (loggedIn) {
      fetchRecommendations(timeRange);
    }
  }, [loggedIn, timeRange]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current.pause();
    };
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setLoggedIn(true);
      } else {
        setLoggedIn(false);
      }
    } catch (err) {
      console.error('Error checking authentication status:', err);
      setLoggedIn(false);
    } finally {
      setLoadingAuth(false);
    }
  };

  const fetchRecommendations = async (range) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/recommendations?time_range=${range}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.items || []);
      } else {
        console.error('Failed to fetch recommendations:', res.status);
        setRecommendations([]);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPreview = (track) => {
    if (!track.preview_url) return;

    if (playingTrackId === track.id) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    } else {
      audioRef.current.pause();
      audioRef.current.src = track.preview_url;
      audioRef.current.play();
      setPlayingTrackId(track.id);

      audioRef.current.onended = () => {
        setPlayingTrackId(null);
      };
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Error logging out:', err);
    }
    setLoggedIn(false);
    setUser(null);
    window.location.href = '/';
  };

  const handleCreatePlaylistClick = () => {
    if (recommendations.length === 0) {
      alert('No recommendations available to create a playlist.');
      return;
    }
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (playlistName) => {
    setIsModalOpen(false);

    const trackUris = recommendations.map((t) => t.uri);

    try {
      const res = await fetch(`${API_BASE_URL}/create-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          playlist_name: playlistName,
          track_uris: trackUris,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotification({
          isOpen: true,
          message: data.message,
          playlistUrl: data.playlist_url,
        });
      } else {
        const errorData = await res.json();
        alert(`Error creating playlist: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error creating playlist:', err);
      alert('An error occurred while creating the playlist.');
    }
  };

  if (loadingAuth) {
    return (
      <div className="dashboard-wrapper discover-wrapper">
        <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.9rem' }}>Verifying Spotify session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper discover-wrapper">
      <div className="dashboard-container">
        {!loggedIn ? (
          <div className="login-content" style={{ margin: '0 auto' }}>
            <h2>Your session has expired.</h2>
            <button className="login-button" onClick={() => (window.location.href = '/')} style={{ marginTop: '2rem' }}>
              Login with Spotify
            </button>
          </div>
        ) : (
          <>
            <Navbar user={user} onLogout={handleLogout} />

            {/* Discover Hero Header */}
            <div className="discover-hero">
              <div className="hero-text">
                <div className="title-with-info">
                  <h1>
                    Smart Music Discoveries
                    <button
                      type="button"
                      className="info-icon-btn"
                      onClick={() => setIsInfoOpen(true)}
                      title="Why Smart Discoveries?"
                    >
                      💡
                    </button>
                  </h1>
                </div>
                <p>Personalized 12-track song recommendations tailored to your top listening habits.</p>
              </div>

              {/* Controls Bar */}
              <div className="discover-controls">
                <div className="select-container">
                  <label htmlFor="timeRangeSelect">Base Sound Vibe:</label>
                  <CustomDropdown
                    options={[
                      { value: 'short_term', label: 'Last 4 Weeks Vibe' },
                      { value: 'medium_term', label: 'Last 6 Months Vibe' },
                      { value: 'long_term', label: 'All Time Vibe' },
                    ]}
                    value={timeRange}
                    onChange={(val) => setTimeRange(val)}
                  />

                  {recommendations.length > 0 && (
                    <button
                      onClick={handleCreatePlaylistClick}
                      className="add-playlist-icon-btn"
                      title="Save recommendations to Spotify Playlist"
                    >
                      ➕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendations Grid */}
            <section className="dashboard-section discover-section">
              {loading ? (
                <div className="discover-loading">
                  <div className="spinner"></div>
                  <p>Curating 12 fresh recommendations for you...</p>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="recommendations-grid">
                  {recommendations.map((track) => {
                    const albumCover = track.album?.images?.[0]?.url;
                    const isPlaying = playingTrackId === track.id;

                    return (
                      <div key={track.id} className={`rec-card ${isPlaying ? 'playing' : ''}`}>
                        <div className="rec-cover-wrapper">
                          <img src={albumCover} alt={track.name} className="rec-cover" />
                          {track.preview_url && (
                            <button
                              type="button"
                              className={`play-preview-overlay ${isPlaying ? 'is-active' : ''}`}
                              onClick={() => handlePlayPreview(track)}
                              title={isPlaying ? 'Pause Preview' : 'Play 30s Audio Preview'}
                            >
                              {isPlaying ? '⏸️' : '▶️'}
                            </button>
                          )}
                        </div>

                        <div className="rec-info">
                          <span className="rec-title" title={track.name}>
                            {track.name}
                          </span>
                          <span className="rec-artist" title={track.artists.map((a) => a.name).join(', ')}>
                            {track.artists.map((a) => a.name).join(', ')}
                          </span>
                          <span className="rec-album">{track.album.name}</span>
                        </div>

                        <div className="rec-actions">
                          {track.preview_url && (
                            <button
                              type="button"
                              className={`preview-pill-btn ${isPlaying ? 'playing-pill' : ''}`}
                              onClick={() => handlePlayPreview(track)}
                            >
                              {isPlaying ? '⏸️ Pause 30s' : '▶️ 30s Sample'}
                            </button>
                          )}

                          <a
                            href={track.external_urls?.spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="spotify-link-btn"
                          >
                            Listen ↗
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="discover-empty">
                  <p>No recommendations found for this time range. Try switching your vibe!</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* Modal for Playlist Export */}
        <PlaylistModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          defaultName={`My Smart Discoveries (${timeRange === 'short_term' ? 'Recent' : timeRange === 'medium_term' ? '6 Months' : 'All Time'})`}
        />

        <ConfirmationNotification
          isOpen={notification.isOpen}
          message={notification.message}
          playlistUrl={notification.playlistUrl}
          onConfirm={() => {
            setNotification({ ...notification, isOpen: false });
            if (notification.playlistUrl) window.open(notification.playlistUrl, '_blank');
          }}
          onCancel={() => setNotification({ ...notification, isOpen: false })}
        />

        {/* Why Smart Discoveries Info Modal */}
        {isInfoOpen && (
          <div className="modal-overlay" onClick={() => setIsInfoOpen(false)}>
            <div className="modal-content info-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>💡 Why Smart Discoveries?</h2>
                <button className="modal-close-btn" onClick={() => setIsInfoOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="info-modal-body">
                <p className="info-intro" style={{ fontSize: '0.92rem', color: '#e4e4e7', lineHeight: '1.55' }}>
                  Unlike Spotify's home feed, which pushes sponsored songs, label promos, and repetitive radio loops, <b>Smart Discoveries</b> digs straight into your real listening taste.
                </p>

                <ul style={{ color: '#a1a1aa', fontSize: '0.85rem', paddingLeft: '1.2rem', lineHeight: '1.7', margin: '0.8rem 0' }}>
                  <li><b>Zero Sponsored Filler:</b> 100% pure recommendations based on artists you actually play.</li>
                  <li><b>Time-Machine Vibe:</b> Pick recommendations from your last month, 6 months, or all-time stats.</li>
                  <li><b>30s Quick Samples:</b> Audition 12 songs in 1 minute without playing full 3-minute tracks.</li>
                  <li><b>1-Click Save:</b> Instantly export all 12 discoveries straight to your Spotify library.</li>
                </ul>
              </div>

              <div className="modal-actions" style={{ justifyContent: 'center' }}>
                <button className="modal-submit-btn" onClick={() => setIsInfoOpen(false)}>
                  Got It, Let's Discover!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Discover;
