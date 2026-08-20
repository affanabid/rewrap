import React, { useState } from 'react';
import './RegisterModal.css';

function RegisterModal({ isOpen, onClose, apiBaseUrl }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please enter both your name and Spotify email address.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${apiBaseUrl}/register-spotify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to register user. Please try again.');
      }
    } catch (err) {
      console.error('Registration network error:', err);
      setError('Could not connect to backend server. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    if (loading) return;
    setName('');
    setEmail('');
    setError('');
    setResult(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleModalClose}>
      <div className="modal-content register-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleModalClose} disabled={loading}>
          &times;
        </button>

        <h2>Request Spotify App Access</h2>

        {result ? (
          <div className="register-success">
            <div className="success-icon">✓</div>
            <h3>Access Granted!</h3>
            <p>{result.message}</p>
            <button className="login-now-btn" onClick={handleModalClose}>
              Done! Continue to Login
            </button>
          </div>
        ) : (
          <>
            <p className="register-info">
              Enter your name and Spotify email address to register for access.
            </p>

            <form onSubmit={handleSubmit} className="register-form">
              {error && <div className="register-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="reg-name">Your Full Name</label>
              <input
                id="reg-name"
                type="text"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Spotify Account Email</label>
              <input
                id="reg-email"
                type="email"
                placeholder="e.g. jane@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="submit-reg-btn" disabled={loading}>
              {loading ? (
                <span className="spinner-container">
                  <span className="spinner"></span> Registering on Spotify Dashboard (~10-15s)...
                </span>
              ) : (
                'Register & Grant Access'
              )}
            </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default RegisterModal;
