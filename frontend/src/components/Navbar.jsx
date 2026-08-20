import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const getUserInitial = () => {
    if (!user) return 'S';
    const displayName = user.display_name || user.id || '';
    return displayName[0].toUpperCase();
  };

  const renderProfileButton = () => (
    user && (
      <div className="profile-button-container">
        <button
          className="profile-button"
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          title={user?.display_name || user?.id}
        >
          {user?.images?.[0]?.url ? (
            <img src={user.images[0].url} alt="profile" className="profile-avatar" />
          ) : (
            <div className="profile-avatar-initial">{getUserInitial()}</div>
          )}
        </button>

        {isProfileMenuOpen && (
          <div className="profile-menu">
            <div className="profile-menu-item profile-user-info">
              {user?.images?.[0]?.url ? (
                <img src={user.images[0].url} alt="profile" className="menu-avatar" />
              ) : (
                <div className="menu-avatar-initial">{getUserInitial()}</div>
              )}
              <span className="profile-user-name">{user?.display_name || user?.id}</span>
            </div>
            <div className="profile-menu-divider"></div>
            <button
              className="profile-menu-item logout-menu-item"
              onClick={onLogout}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    )
  );

  return (
    <nav className="navbar-container">
      {/* Brand row (Logo + Mobile Avatar slot) */}
      <div className="navbar-brand-row">
        <NavLink to="/dashboard" className="navbar-logo">
          Spotify Re<span className="logo-accent">Wrap</span>
        </NavLink>
        <div className="mobile-profile-slot">
          {renderProfileButton()}
        </div>
      </div>

      {/* Controls row (Analytics/Discover toggle + Desktop Avatar slot) */}
      <div className="navbar-controls-row">
        <div className="navbar-links">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Analytics
          </NavLink>
          <NavLink
            to="/discover"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Discover
          </NavLink>
        </div>

        <div className="desktop-profile-slot">
          {renderProfileButton()}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
