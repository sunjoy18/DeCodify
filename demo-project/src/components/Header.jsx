import React, { useState } from 'react';
import { Navigation } from './Navigation';
import { ThemeToggle } from './ThemeToggle';

/**
 * Header component with user authentication and navigation
 */
const Header = ({ user, onLogin, onLogout, onThemeToggle, theme }) => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    onLogin(credentials);
    setShowLoginForm(false);
    setCredentials({ username: '', password: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo">
          <h1>Demo App</h1>
        </div>
        
        <Navigation user={user} />
        
        <div className="header-actions">
          <ThemeToggle 
            theme={theme}
            onToggle={onThemeToggle}
          />
          
          {user ? (
            <div className="user-menu">
              <span>Welcome, {user.name}</span>
              <button onClick={onLogout} className="logout-btn">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-section">
              {showLoginForm ? (
                <form onSubmit={handleLoginSubmit} className="login-form">
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={credentials.username}
                    onChange={handleInputChange}
                    required
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={credentials.password}
                    onChange={handleInputChange}
                    required
                  />
                  <button type="submit">Login</button>
                  <button 
                    type="button" 
                    onClick={() => setShowLoginForm(false)}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button 
                  onClick={() => setShowLoginForm(true)}
                  className="login-btn"
                >
                  Login
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 