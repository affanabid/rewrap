import React, { useState } from 'react';
import './WrappedStoryCard.css';

function WrappedStoryCard({
  user,
  topArtists,
  topTracks,
  genreDistribution,
  timeRange,
  cardRef,
  artistLimit = 1,
  trackLimit = 5,
  genreLimit = 3,
  showUserBadge = true,
}) {
  const [avatarError, setAvatarError] = useState(false);
  const [artistImgError, setArtistImgError] = useState(false);

  const displayedArtists = topArtists ? topArtists.slice(0, artistLimit) : [];
  const topArtist = displayedArtists.length > 0 ? displayedArtists[0] : null;
  const secondaryArtists = displayedArtists.slice(1);

  const displayedTracks = topTracks ? topTracks.slice(0, trackLimit) : [];
  const displayedGenres = genreDistribution ? genreDistribution.slice(0, genreLimit) : [];

  const getTimeRangeLabel = (range) => {
    switch (range) {
      case 'short_term':
        return 'LAST 4 WEEKS';
      case 'medium_term':
        return 'LAST 6 MONTHS';
      case 'long_term':
        return 'ALL-TIME STATS';
      default:
        return 'MUSIC RE-WRAPPED';
    }
  };

  const userAvatar = user?.images?.[0]?.url;
  const topArtistImage = topArtist?.images?.[0]?.url;
  const userName = user?.display_name || user?.id || 'Spotify Listener';
  const userInitial = userName ? userName[0].toUpperCase() : 'S';

  return (
    <div className="wrapped-story-card-wrapper">
      <div className="wrapped-story-card" ref={cardRef}>
        {/* Background Ambient Shapes */}
        <div className="story-bg-mesh">
          <div className="mesh-blob blob-1"></div>
          <div className="mesh-blob blob-2"></div>
          <div className="mesh-blob blob-3"></div>
        </div>

        {/* Card Content Overlay */}
        <div className="story-card-content">
          {/* Header */}
          <div className="story-header">
            {showUserBadge ? (
              <div className="story-user-badge">
                {userAvatar && !avatarError ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="story-avatar"
                    crossOrigin="anonymous"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="story-avatar-initial">
                    {userInitial}
                  </div>
                )}
                <span className="story-username">{userName}</span>
              </div>
            ) : (
              <div></div>
            )}
            <div className="story-period-pill">{getTimeRangeLabel(timeRange)}</div>
          </div>

          {/* Title Branding */}
          <div className="story-branding">
            <h2>MY RE<span className="branding-accent">WRAP</span></h2>
            <p className="story-subtitle">MY PERSONAL SOUNDTRACK</p>
          </div>

          {/* Top Artist Spotlight & Secondary Chips */}
          {topArtist && (
            <div className="story-artist-section">
              <div className="story-artist-spotlight">
                <div className="spotlight-image-container">
                  {topArtistImage && !artistImgError ? (
                    <img
                      src={topArtistImage}
                      alt={topArtist.name}
                      className="spotlight-artist-img"
                      crossOrigin="anonymous"
                      onError={() => setArtistImgError(true)}
                    />
                  ) : (
                    <div className="spotlight-artist-img-fallback">
                      {topArtist.name[0]}
                    </div>
                  )}
                  <span className="spotlight-rank">#1 ARTIST</span>
                </div>
                <div className="spotlight-info">
                  <h3>{topArtist.name}</h3>
                  {topArtist.genres && topArtist.genres.length > 0 && (
                    <span className="spotlight-genre">{topArtist.genres[0]}</span>
                  )}
                </div>
              </div>

              {/* Secondary Artists List (If Limit > 1) */}
              {secondaryArtists.length > 0 && (
                <div className="secondary-artists-list">
                  {secondaryArtists.map((art, idx) => (
                    <div key={art.id || idx} className="secondary-artist-chip">
                      <span className="chip-rank">#{idx + 2}</span>
                      <span className="chip-name">{art.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top Tracks List Section */}
          <div className="story-tracks-section">
            <h4 className="section-title">TOP TRACKS ({displayedTracks.length})</h4>
            <div className="story-tracks-list">
              {displayedTracks.map((track, index) => {
                const trackImg = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url;
                return (
                  <div key={track.id || index} className="story-track-item">
                    <span className="track-rank">0{index + 1}</span>
                    {trackImg && (
                      <img
                        src={trackImg}
                        alt={track.name}
                        className="track-cover"
                        crossOrigin="anonymous"
                      />
                    )}
                    <div className="track-details">
                      <span className="track-title">{track.name}</span>
                      <span className="track-artist">
                        {track.artists.map((a) => a.name).join(', ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Genres Section */}
          {genreLimit > 0 && displayedGenres.length > 0 && (
            <div className="story-genres-section">
              <span className="genres-label">TOP GENRES</span>
              <div className="story-genre-tags">
                {displayedGenres.map((g, idx) => (
                  <span key={idx} className="story-genre-pill">
                    #{g.genre}
                  </span>
                ))}
              </div>
            </div>
          )}


          {/* Footer Branding Watermark */}
          <div className="story-footer">
            <div className="spotify-logo-badge">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="spotify-svg">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <span>Spotify Re-Wrapped</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WrappedStoryCard;
