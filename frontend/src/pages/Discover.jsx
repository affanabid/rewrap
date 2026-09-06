import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import Navbar from '../components/Navbar';
import PlaylistModal from '../components/PlaylistModal';
import ConfirmationNotification from '../components/ConfirmationNotification';
import CustomDropdown from '../components/CustomDropdown';
import { API_BASE_URL } from '../config';
import './Discover.css';

function Discover() {
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated' | 'session_expired' | 'server_error'
  const [authErrorMessage, setAuthErrorMessage] = useState('');
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
    if (authState === 'authenticated') {
      fetchRecommendations(timeRange);
    }
  }, [authState, timeRange]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current.pause();
    };
  }, []);

  const fetchUserData = async () => {
    setAuthState('loading');
    setAuthErrorMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setAuthState('authenticated');
      } else if (res.status === 401) {
        setUser(null);
        setAuthState('unauthenticated');
      } else {
        setUser(null);
        setAuthState('server_error');
        setAuthErrorMessage(`Server returned status ${res.status}. If the backend is waking up, please wait a moment.`);
      }
    } catch (err) {
      console.error('Error checking authentication status:', err);
      setUser(null);
      setAuthState('server_error');
      setAuthErrorMessage('Unable to connect to backend server. If the backend is waking up, please wait a moment and retry.');
    }
  };

  const fetchRecommendations = async (range) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/recommendations?time_range=${range}`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        setAuthState('session_expired');
        setUser(null);
        setRecommendations([]);
        return;
      }
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

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
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
    setAuthState('unauthenticated');
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

      if (res.status === 401) {
        setAuthState('session_expired');
        alert('Your Spotify session has expired. Please log in again.');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setNotification({
          isOpen: true,
          message: data.message,
          playlistUrl: data.playlist_url,
        });
      } else {
        const errorData = await res.json();
        alert(`Error creating playlist: ${errorData.error || 'Failed to create playlist'}`);
      }
    } catch (err) {
      console.error('Error creating playlist:', err);
      alert('An error occurred while creating the playlist.');
    }
  };

  if (authState === 'loading') {
    return (
      <div className="dashboard-wrapper discover-wrapper">
        <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.9rem' }}>Verifying Spotify session...</p>
        </div>
      </div>
    );
  }

  if (authState === 'server_error') {
    return (
      <div className="dashboard-wrapper discover-wrapper">
        <div className="dashboard-container">
          <div className="login-content" style={{ margin: '0 auto', textAlign: 'center', maxWidth: '480px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔌</div>
            <h2>Unable to Connect to Server</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: '1.5' }}>
              {authErrorMessage || 'Could not reach backend service. If the server is sleeping, it may take 30–60 seconds to spin up.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <button className="login-button" onClick={fetchUserData}>
                Retry Connection
              </button>
              <button 
                className="login-button" 
                onClick={() => (window.location.href = '/')}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="dashboard-wrapper discover-wrapper">
        <div className="dashboard-container">
          <div className="login-content" style={{ margin: '0 auto', textAlign: 'center', maxWidth: '460px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎵</div>
            <h2>Log In to Discover Music</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              Connect your Spotify account to discover new personalized songs based on your listening profile.
            </p>
            <button className="login-button" onClick={handleLogin} style={{ marginTop: '2rem' }}>
              Log In with Spotify
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'session_expired') {
    return (
      <div className="dashboard-wrapper discover-wrapper">
        <div className="dashboard-container">
          <div className="login-content" style={{ margin: '0 auto', textAlign: 'center', maxWidth: '460px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱️</div>
            <h2>Session Expired</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              Your Spotify session has timed out or was revoked. Please log in again to continue.
            </p>
            <button className="login-button" onClick={handleLogin} style={{ marginTop: '2rem' }}>
              Log In Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper discover-wrapper">
      <div className="dashboard-container">
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
              <div className="controls-row">
                <CustomDropdown
                  options={[
                    { value: 'short_term', label: 'Last 4 Weeks Vibe' },
                    { value: 'medium_term', label: 'Last 6 Months Vibe' },
                    { value: 'long_term', label: 'All Time Vibe' },
                  ]}
                  value={timeRange}
                  onChange={(val) => setTimeRange(val)}
                />
              </div>
            </div>

            <button
              onClick={handleCreatePlaylistClick}
              className="export-playlist-btn"
              disabled={recommendations.length === 0}
            >
              Export Discoveries to Spotify
            </button>
          </div>
        </div>

        {/* Recommendations Section */}
        <section className="discover-section">
          {loading ? (
            <div className="discover-loading">
              <div className="spinner"></div>
              <p>Curating your personalized tracks...</p>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="discover-grid">
              {recommendations.map((track, index) => {
                const isPlaying = playingTrackId === track.id;
                const hasPreview = Boolean(track.preview_url);

                return (
                  <div
                    className={`discover-card ${isPlaying ? 'playing' : ''}`}
                    key={track.id}
                  >
                    <div className="cover-wrapper">
                      <img
                        src={track.album?.images?.[0]?.url || 'https://via.placeholder.com/300'}
                        alt={track.name}
                        className="track-cover"
                      />
                      {hasPreview ? (
                        <button
                          type="button"
                          className={`play-btn-overlay ${isPlaying ? 'playing' : ''}`}
                          onClick={() => handlePlayPreview(track)}
                          title={isPlaying ? 'Pause preview' : 'Play 30s preview'}
                        >
                          {isPlaying ? '⏸' : '▶'}
                        </button>
                      ) : (
                        <div className="no-preview-tag" title="Preview not available from Spotify">
                          No Preview
                        </div>
                      )}
                    </div>

                    <div className="track-info">
                      <h4 className="track-title" title={track.name}>
                        {track.name}
                      </h4>
                      <p className="track-artist" title={track.artists?.map((a) => a.name).join(', ')}>
                        {track.artists?.map((a) => a.name).join(', ')}
                      </p>
                    </div>

                    <a
                      href={track.external_urls?.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="spotify-link-btn"
                      title="Open in Spotify"
                    >
                      Open
                    </a>
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
        {isInfoOpen && ReactDOM.createPortal(
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
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

export default Discover;
