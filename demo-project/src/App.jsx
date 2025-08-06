import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserProfile from './components/UserProfile';
import Dashboard from './components/Dashboard';
import { UserService } from './services/UserService';
import './App.css';

/**
 * Main application component
 * Manages user state and navigation
 */
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      loading: true,
      theme: 'light'
    };
    this.userService = new UserService();
  }

  componentDidMount() {
    this.initializeApp();
  }

  async initializeApp() {
    try {
      const user = await this.userService.getCurrentUser();
      this.setState({ user, loading: false });
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.setState({ loading: false });
    }
  }

  handleUserLogin = async (credentials) => {
    const user = await this.userService.login(credentials);
    this.setState({ user });
  }

  handleUserLogout = () => {
    this.userService.logout();
    this.setState({ user: null });
  }

  toggleTheme = () => {
    const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
    this.setState({ theme: newTheme });
  }

  render() {
    const { user, loading, theme } = this.state;

    if (loading) {
      return <div className="loading">Loading...</div>;
    }

    return (
      <div className={`app theme-${theme}`}>
        <Header 
          user={user}
          onLogin={this.handleUserLogin}
          onLogout={this.handleUserLogout}
          onThemeToggle={this.toggleTheme}
          theme={theme}
        />
        
        <main className="main-content">
          {user ? (
            <>
              <UserProfile user={user} />
              <Dashboard user={user} />
            </>
          ) : (
            <div className="welcome">
              <h1>Welcome to Demo App</h1>
              <p>Please log in to continue</p>
            </div>
          )}
        </main>
      </div>
    );
  }
}

export default App; 