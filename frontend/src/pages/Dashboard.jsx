import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PlaylistModal from '../components/PlaylistModal';
import ConfirmationNotification from '../components/ConfirmationNotification';
import ShareStoryModal from '../components/ShareStoryModal';
import Navbar from '../components/Navbar';
import CustomDropdown from '../components/CustomDropdown';
import '../App.css';
import { API_BASE_URL } from '../config';

function Dashboard() {
  const [loadingAuth, setLoadingAuth] = useState(true);
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
  const [isShareStoryModalOpen, setIsShareStoryModalOpen] = useState(false);

  const PIE_COLORS = ['#1DB954', '#00F2FE', '#7928CA', '#FFB800', '#FF007F'];

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
      { name: 'Quick Bites (<2.5m)', count: short },
      { name: 'Sweet Spot (2.5-4m)', count: medium },
      { name: 'Deep Jams (>4m)', count: long },
    ]);
  };

  const fetchTopData = async (selectedTimeRange) => {
    if (!user) return;

    try {
      const artistsRes = await fetch(`${API_BASE_URL}/top-artists?time_range=${selectedTimeRange}`, {
        credentials: 'include',
      });
      if (artistsRes.ok) {
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

  const checkAuth = async () => {
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
      console.error('Error checking auth:', err);
      setLoggedIn(false);
    } finally {
      setLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (loggedIn && user) {
      fetchTopData(timeRange);
    }
  }, [loggedIn, user, timeRange]);

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
    setLoggedIn(false);
    setUser(null);
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

  if (loadingAuth) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.9rem' }}>Verifying Spotify session...</p>
        </div>
      </div>
    );
  }

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
            <Navbar user={user} onLogout={handleLogout} />

            <div className="controls-bar">
              <div className="select-container">
                <label htmlFor="timeRangeSelect">Time Range</label>
                <CustomDropdown
                  options={[
                    { value: 'short_term', label: 'Last 4 Weeks' },
                    { value: 'medium_term', label: 'Last 6 Months' },
                    { value: 'long_term', label: 'All Time' },
                  ]}
                  value={timeRange}
                  onChange={(val) => handleTimeRangeChange({ target: { value: val } })}
                />
              </div>

              <div className="controls-actions">
                {topTracks.length > 0 && (
                  <button onClick={handleCreatePlaylistClick} className="create-playlist-button">
                    Create Playlist
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsShareStoryModalOpen(true)}
                  className="share-story-button"
                >
                  Export Story Card
                </button>
              </div>
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
              <h3 className="section-title">What You've Been Up To</h3>

              {/* KPI Metric Summary Grid */}
              {(topTracks.length > 0 || topArtists.length > 0) && (
                <div className="kpi-grid">
                  {/* Total Listening Time */}
                  <div className="kpi-card">
                    <div className="kpi-icon">⏱️</div>
                    <div className="kpi-details">
                      <span className="kpi-label">TOTAL TIME</span>
                      <span className="kpi-value">
                        {Math.floor(totalTopTracksDuration / 3600000)}h {Math.floor((totalTopTracksDuration % 3600000) / 60000)}m
                      </span>
                      <span className="kpi-subtext">from top {topTracks.length} tracks</span>
                    </div>
                  </div>

                  {/* Top Artist */}
                  {topArtists.length > 0 && (
                    <div className="kpi-card">
                      {topArtists[0].images?.[0]?.url ? (
                        <img src={topArtists[0].images[0].url} alt={topArtists[0].name} className="kpi-avatar" />
                      ) : (
                        <div className="kpi-icon">👑</div>
                      )}
                      <div className="kpi-details">
                        <span className="kpi-label">TOP ARTIST</span>
                        <span className="kpi-value" title={topArtists[0].name}>{topArtists[0].name}</span>
                        <span className="kpi-subtext">#1 Most Played</span>
                      </div>
                    </div>
                  )}

                  {/* Top Track */}
                  {topTracks.length > 0 && (
                    <div className="kpi-card">
                      {topTracks[0].album?.images?.[0]?.url ? (
                        <img src={topTracks[0].album.images[0].url} alt={topTracks[0].name} className="kpi-avatar rounded-sq" />
                      ) : (
                        <div className="kpi-icon">🎵</div>
                      )}
                      <div className="kpi-details">
                        <span className="kpi-label">TOP TRACK</span>
                        <span className="kpi-value" title={topTracks[0].name}>{topTracks[0].name}</span>
                        <span className="kpi-subtext">{topTracks[0].artists?.[0]?.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Top Genre */}
                  {genreDistributionData.length > 0 && (
                    <div className="kpi-card">
                      <div className="kpi-icon">⚡</div>
                      <div className="kpi-details">
                        <span className="kpi-label">TOP GENRE</span>
                        <span className="kpi-value text-capitalize" title={genreDistributionData[0].genre}>
                          {genreDistributionData[0].genre}
                        </span>
                        <span className="kpi-subtext">{genreDistributionData[0].count} artist matches</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced Visual Charts Grid */}
              {(artistsByTrackCountData.length > 0 || genreDistributionData.length > 0) ? (
                <div className="charts-layout">
                  {/* Chart 1: Artist Repeat Bar Chart */}
                  {artistsByTrackCountData.length > 0 && (
                    <div className="chart-card">
                      <div className="chart-header">
                        <h4 className="chart-title">Who's Been on Repeat</h4>
                      </div>
                      <div className="recharts-responsive-container">
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={artistsByTrackCountData} margin={{ top: 10, right: 10, left: -20, bottom: 35 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                              tickLine={false}
                              axisLine={false}
                              interval={0}
                              angle={-35}
                              textAnchor="end"
                            />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#18181b',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '8px',
                                color: '#fff',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.6)'
                              }}
                              itemStyle={{ color: '#1DB954', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="trackCount" fill="#1DB954" radius={[6, 6, 0, 0]} name="Tracks Count" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Chart 2: Genre Donut Spectrum */}
                  {genreDistributionData.length > 0 && (
                    <div className="chart-card">
                      <div className="chart-header">
                        <h4 className="chart-title">Genres You've Been Into</h4>
                      </div>
                      <div className="recharts-responsive-container">
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={genreDistributionData.slice(0, 5)}
                              dataKey="count"
                              nameKey="genre"
                              cx="50%"
                              cy="50%"
                              outerRadius="75%"
                              innerRadius="48%"
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
                              contentStyle={{
                                backgroundColor: '#18181b',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '8px',
                                color: '#fff',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.6)'
                              }}
                              itemStyle={{ color: '#00F2FE', fontWeight: 'bold' }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: 12, paddingTop: 15, color: 'var(--text-secondary)' }}
                              formatter={(value) => <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{value}</span>}
                            />
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

        <ShareStoryModal
          isOpen={isShareStoryModalOpen}
          onClose={() => setIsShareStoryModalOpen(false)}
          user={user}
          topArtists={topArtists}
          topTracks={topTracks}
          genreDistribution={genreDistributionData}
          timeRange={timeRange}
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
