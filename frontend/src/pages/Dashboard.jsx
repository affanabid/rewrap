import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PlaylistModal from '../components/PlaylistModal';
import ConfirmationNotification from '../components/ConfirmationNotification';
import '../App.css';

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
  // const API_BASE_URL = 'https://rewrap.onrender.com';
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://rewrap.onrender.com';

  const PIE_COLORS = ['#93B1A6', '#5C8374', '#3a6363']; // Example: green, teal, yellow

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
        const artistsData = await artistsRes.json();
        setTopArtists(artistsData.items);
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

  useEffect(() => {
    if (loggedIn) {
      fetchTopData(timeRange);
    }
  }, [timeRange, loggedIn]);

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
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

  return (
    <div className="dashboard-container">
      <h1>Spotify Re-Wrapped </h1>
      {!loggedIn ? (
        <div className="auth-section">
        <button onClick={handleLogin}>Login with Spotify</button>
        </div>
      ) : (
        <div className="dashboard-content">
          <h2>Welcome, {user.display_name || user.id}!</h2>
          {/* <p>Email: {user.email}</p> */}
          {user.images?.[0]?.url && (
            <img src={user.images[0].url} alt="avatar" className="avatar" />
          )}

          <div className="select-container">
            <label htmlFor="timeRangeSelect">Select Time Range: </label>
            <select id="timeRangeSelect" value={timeRange} onChange={handleTimeRangeChange}>
              <option value="short_term">Last 4 Weeks</option>
              <option value="medium_term">Last 6 Months</option>
              <option value="long_term">All Time</option>
            </select>
          </div>

          {loggedIn && topTracks.length > 0 && (
            <button onClick={handleCreatePlaylistClick} className="create-playlist-button">
              Create Playlist from Top Tracks
            </button>
          )}

          <div className="dashboard-section">
            <h3>Your Top Artists by Track Count ({getTimeRangeDisplayName(timeRange)})</h3>
            {topArtists.length > 0 && artistsByTrackCountData.length > 0 ? (
              <>
                <div className="chart-wrapper">
                  <BarChart
                  // style={{minWidth: '700px'}}
                    width={700}
                    height={300}
                    data={artistsByTrackCountData}
                    margin={{
                      top: 5, right: 30, left: 20, bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} tracks`} />
                    <Legend />
                    <Bar dataKey="trackCount" fill="#5C8374" name="Number of Tracks" />
                  </BarChart>
                </div>
                <ol className="artists-list">
                  {topArtists.map((artist) => (
                    <li key={artist.id}>
                      {artist.name}
                      {artist.images?.[0]?.url && (
                        <img src={artist.images[0].url} alt={artist.name} width={50} className="artist-image" />
                      )}
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p>Loading top artists or no data available...</p>
            )}
          </div>

          {totalTopTracksDuration > 0 && (
            <div className="duration-box">
              <h3>Total Duration of Your Top Tracks ({getTimeRangeDisplayName(timeRange)})</h3>
              <p className="large-text">
                {Math.floor(totalTopTracksDuration / 3600000)}h {Math.floor((totalTopTracksDuration % 3600000) / 60000)}m {Math.floor(((totalTopTracksDuration % 3600000) % 60000) / 1000)}s
              </p>
              <p className="small-text">
                (Based on the duration of your top 20 tracks from this period)
              </p>
            </div>
          )}

          <div className="dashboard-section">
            <h3>Track Duration Distribution ({getTimeRangeDisplayName(timeRange)})</h3>
            {trackDurationData.length > 0 && trackDurationData[0].count + trackDurationData[1].count + trackDurationData[2].count > 0 ? (
              <>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={trackDurationData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label
                      >
                        {/* {trackDurationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / trackDurationData.length}, 70%, 50%)`} />
                        ))} */}
                        {trackDurationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} tracks`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <h3>Your Top Tracks List ({getTimeRangeDisplayName(timeRange)})</h3>
                <ol className="tracks-list">
                  {topTracks.map((track) => (
                    <li key={track.id}>
                      <div className="track-details">
                        <span className="track-name">{track.name}</span>
                        <span className="track-artists">{track.artists.map(artist => artist.name).join(', ')}</span>
                      </div>
                      {track.album.images?.[0]?.url && (
                        <img src={track.album.images[0].url} alt={track.album.name} width={50} className="track-album-image" />
                      )}
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p>No track data available or loading...</p>
            )}
          </div>
        </div>
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
    </div>
  );
}

export default Dashboard;
