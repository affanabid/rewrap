//Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PlaylistModal from '../components/PlaylistModal';
import ConfirmationNotification from '../components/ConfirmationNotification';
import '../App.css';
import { API_BASE_URL } from '../config';

function Dashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [topArtists, setTopArtists] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [timeRange, setTimeRange] = useState('short_term');
  const [totalTopTracksDuration, setTotalTopTracksDuration] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, message: '', playlistUrl: '' });
  const [artistsByTrackCountData, setArtistsByTrackCountData] = useState([]);
  const [trackDurationData, setTrackDurationData] = useState([]);
  const [genreDistributionData, setGenreDistributionData] = useState([]);
  const [isArtistsOpen, setIsArtistsOpen] = useState(false);
  const [isTracksOpen, setIsTracksOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // const API_BASE_URL = 'https://rewrap.onrender.com';
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://rewrap.onrender.com';

  const PIE_COLORS = ['#aeebd4', '#4fa8a8', '#3a6363', '#78bfbf', '#759c98', '#16524b'];

  const calculateTotalTrackDuration = (tracks) => {
    const totalMs = tracks.reduce((sum, track) => sum + track.duration_ms, 0);
    setTotalTopTracksDuration(totalMs);
  };

  const processArtistsByTrackCount = (tracks) => {
    const artistTrackCounts = {};
    tracks.forEach(track => {
      track.artists.forEach(artist => {
        artistTrackCounts[artist.name] = (artistTrackCounts[artist.name] || 0) + 1;
      });
    });

    const data = Object.keys(artistTrackCounts).map(artistName => ({
      name: artistName,
      trackCount: artistTrackCounts[artistName]
    }));

    data.sort((a, b) => b.trackCount - a.trackCount);
    setArtistsByTrackCountData(data.slice(0, 10));
  };

  const processTrackDurationData = (tracks) => {
    let short = 0;
    let medium = 0;
    let long = 0;

    tracks.forEach(track => {
      const durationMinutes = track.duration_ms / 60000;
      if (durationMinutes < 2.5) {
        short++;
      } else if (durationMinutes >= 2.5 && durationMinutes <= 4) {
        medium++;
      } else {
        long++;
      }
    });

    setTrackDurationData([
      { name: 'Short (<2.5 min)', count: short },
      { name: 'Medium (2.5-4 min)', count: medium },
      { name: 'Long (>4 min)', count: long },
    ]);
  };

  const fetchTopData = async (selectedTimeRange) => {
    if (!user) return;

    try {
      const artistsRes = await fetch(`${API_BASE_URL}/top-artists?time_range=${selectedTimeRange}`, {
        credentials: 'include',
      });
      if (artistsRes.ok) {
        // const artistsData = await artistsRes.json();
        // setTopArtists(artistsData.items);
        const artistsData = await artistsRes.json();
        setTopArtists(artistsData.artists || []);
        setGenreDistributionData(artistsData.genre_distribution || []);

      } else {
        console.error('Failed to fetch top artists:', artistsRes.status);
        setTopArtists([]);
      }

      const tracksRes = await fetch(`${API_BASE_URL}/top-tracks?time_range=${selectedTimeRange}`, {
        credentials: 'include',
      });
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        setTopTracks(tracksData.items);
        calculateTotalTrackDuration(tracksData.items);
        processArtistsByTrackCount(tracksData.items);
        processTrackDurationData(tracksData.items);
      } else {
        console.error('Failed to fetch top tracks:', tracksRes.status);
        setTopTracks([]);
        setTotalTopTracksDuration(0);
        setArtistsByTrackCountData([]);
        setTrackDurationData([]);
      }
    } catch (err) {
      console.error('Error fetching top data:', err);
      setTopArtists([]);
      setTopTracks([]);
      setTotalTopTracksDuration(0);
      setArtistsByTrackCountData([]);
      setTrackDurationData([]);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const userData = await res.json();
        setLoggedIn(true);
        setUser(userData);
        fetchTopData(timeRange);
      } else {
        setLoggedIn(false);
        setUser(null);
        setTopArtists([]);
        setTopTracks([]);
        setTotalTopTracksDuration(0);
      }
    } catch (err) {
      console.error('Error checking login status:', err);
      setLoggedIn(false);
      setUser(null);
      setTopArtists([]);
      setTopTracks([]);
      setTotalTopTracksDuration(0);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-button-container')) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (loggedIn) {
      fetchTopData(timeRange);
    }
  }, [timeRange, loggedIn]);

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = '/';
  };

  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
  };

  const handleCreatePlaylistClick = () => {
    if (topTracks.length === 0) {
      alert("No tracks available to create a playlist.");
      return;
    }
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSubmit = async (playlistName) => {
    setIsModalOpen(false);

    const trackUris = topTracks.map(track => track.uri);

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
          playlistUrl: data.playlist_url
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

  const handleNotificationConfirm = () => {
    setNotification({ ...notification, isOpen: false });
    if (notification.playlistUrl) {
      window.open(notification.playlistUrl, '__blank');
    }
  };

  const handleNotificationCancel = () => {
    setNotification({ ...notification, isOpen: false });
  };

  const getTimeRangeDisplayName = (range) => {
    switch (range) {
      case 'short_term': return 'Last 4 Weeks';
      case 'medium_term': return 'Last 6 Months';
      case 'long_term': return 'All Time';
      default: return '';
    }
  };

  const getUserInitial = () => {
    if (!user) return '';
    const displayName = user.display_name || user.id || '';
    return displayName[0].toUpperCase();
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        {!loggedIn ? (
          <div className="login-content" style={{ margin: '0 auto' }}>
            <h2>Your session has expired.</h2>
            <button className="login-button" onClick={handleLogin} style={{ marginTop: '2rem' }}>
              Login with Spotify
            </button>
          </div>
        ) : (
          <>
            <header className="dashboard-header">
              <h1>Spotify Re<span style={{ color: 'var(--primary)' }}>Wrap</span></h1>
              <div className="profile-button-container">
                <button
                  className="profile-button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  title={user?.display_name || user?.id}
                >
                  {user?.images?.[0]?.url ? (
                    <img src={user.images[0].url} alt="profile" className="profile-avatar" />
                  ) : (
                    <div className="profile-avatar-initial">
                      {getUserInitial()}
                    </div>
                  )}
                </button>

                {isProfileMenuOpen && (
                  <div className="profile-menu">
                    <div className="profile-menu-item profile-user-info">
                      {user?.images?.[0]?.url && (
                        <img src={user.images[0].url} alt="profile" className="menu-avatar" />
                      )}
                      {!user?.images?.[0]?.url && (
                        <div className="menu-avatar-initial">
                          {getUserInitial()}
                        </div>
                      )}
                      <span className="profile-user-name">
                        {user?.display_name || user?.id}
                      </span>
                    </div>
                    <div className="profile-menu-divider"></div>
                    <button
                      className="profile-menu-item logout-menu-item"
                      onClick={handleLogout}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </header>

            <div className="controls-bar">
              <div className="select-container">
                <label htmlFor="timeRangeSelect">Time Range</label>
                <select id="timeRangeSelect" value={timeRange} onChange={handleTimeRangeChange}>
                  <option value="short_term">Last 4 Weeks</option>
                  <option value="medium_term">Last 6 Months</option>
                  <option value="long_term">All Time</option>
                </select>
              </div>

              {topTracks.length > 0 && (
                <button onClick={handleCreatePlaylistClick} className="create-playlist-button">
                  Create Playlist
                </button>
              )}
            </div>

            <section className="dashboard-section">
              <h3
                className="section-title section-header-toggle"
                onClick={() => setIsArtistsOpen(!isArtistsOpen)}
              >
                Artists You Can't Stop Playing 
                <svg className={`toggle-icon ${isArtistsOpen ? 'open' : ''}`} width="24" height="24" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </h3>
              <div className={`accordion-content ${isArtistsOpen ? 'open' : ''}`}>
                <div className="accordion-inner">
                  {topArtists.length > 0 ? (
                    <div className="artists-grid">
                      {topArtists.map((artist) => (
                        <div className="grid-card" key={artist.id}>
                          {artist.images?.[0]?.url ? (
                            <img className="artist-img" src={artist.images[0].url} alt={artist.name} />
                          ) : (
                            <div className="artist-img" style={{ background: '#333' }}></div>
                          )}
                          <span className="item-name">{artist.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)' }}>Loading top artists...</p>
                  )}
                </div>
              </div>
            </section>

            {/* {totalTopTracksDuration > 0 && (
              <div className="duration-box">
                <h3>Total Listening Time</h3>
                <p className="large-text">
                  {Math.floor(totalTopTracksDuration / 3600000)}<span style={{ fontSize: '0.6em' }}>h</span>{' '}
                  {Math.floor((totalTopTracksDuration % 3600000) / 60000)}<span style={{ fontSize: '0.6em' }}>m</span>
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>from your top {topTracks.length} tracks</p>
              </div>
            )} */}

            <section className="dashboard-section">
              <h3
                className="section-title section-header-toggle"
                onClick={() => setIsTracksOpen(!isTracksOpen)}
              >
                Tracks on Repeat
                <svg className={`toggle-icon ${isTracksOpen ? 'open' : ''}`} width="24" height="24" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </h3>
              <div className={`accordion-content ${isTracksOpen ? 'open' : ''}`}>
                <div className="accordion-inner">
                  {topTracks.length > 0 ? (
                    <div className="tracks-grid">
                      {topTracks.map((track) => (
                        <div className="grid-card" key={track.id}>
                          {track.album.images?.[0]?.url ? (
                            <img className="track-img" src={track.album.images[0].url} alt={track.album.name} />
                          ) : (
                            <div className="track-img" style={{ background: '#333' }}></div>
                          )}
                          <span className="item-name" title={track.name}>{track.name}</span>
                          <span className="item-subtext" title={track.artists.map(a => a.name).join(', ')}>
                            {track.artists.map(artist => artist.name).join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)' }}>No track data available...</p>
                  )}
                </div>
              </div>
            </section>

            <section className="dashboard-section">
              <h3 className="section-title"> What You've Been Up To</h3>
              {trackDurationData.length > 0 || genreDistributionData.length > 0 ? (
                <div className="charts-layout">
                  {artistsByTrackCountData.length > 0 && (
                    <div className="chart-card">
                      <h4 className="chart-title">Who's Been on Repeat</h4>
                      <div className="recharts-responsive-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={artistsByTrackCountData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" />
                            <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'var(--card-hover)' }} />
                            <Bar dataKey="trackCount" fill="#1DB954" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {genreDistributionData.length > 0 && (
                    <div className="chart-card">
                      <h4 className="chart-title">Genres You've Been Into</h4>
                      <div className="recharts-responsive-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={genreDistributionData.slice(0, 5)}
                              dataKey="count"
                              nameKey="genre"
                              cx="50%"  
                              cy="50%"
                              outerRadius="70%"
                              innerRadius="45%"
                              stroke="var(--card-bg)"
                              strokeWidth={3}
                              paddingAngle={4}
                              activeOuterRadiusOffset={8}
                            >
                              {genreDistributionData.slice(0, 5).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: 'var(--card-bg)', border: 'none', color: 'var(--text-secondary)' }}
                              itemStyle={{ color: 'var(--text-secondary)' }}
                              labelStyle={{ color: 'var(--text-secondary)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 20, color: 'var(--text-secondary)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
              )}
            </section>
          </>
        )}

        <PlaylistModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleModalSubmit}
          defaultPlaylistName={`My Top Tracks (${getTimeRangeDisplayName(timeRange)})`}
        />
        <ConfirmationNotification
          isOpen={notification.isOpen}
          message={notification.message}
          playlistUrl={notification.playlistUrl}
          onConfirm={handleNotificationConfirm}
          onCancel={handleNotificationCancel}
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
    </div>
  );
}

export default Dashboard;
