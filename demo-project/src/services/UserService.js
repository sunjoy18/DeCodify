import { ApiClient } from '../utils/ApiClient';
import { validateEmail, validatePassword } from '../utils/validation';

/**
 * User service for handling authentication and user management
 */
export class UserService {
  constructor() {
    this.apiClient = new ApiClient();
    this.currentUser = null;
    this.authToken = localStorage.getItem('authToken');
  }

  /**
   * Authenticate user with credentials
   * @param {Object} credentials - User login credentials
   * @returns {Promise<Object>} User object
   */
  async login(credentials) {
    const { username, password } = credentials;
    
    if (!this.validateCredentials(username, password)) {
      throw new Error('Invalid credentials format');
    }

    try {
      const response = await this.apiClient.post('/auth/login', {
        username,
        password
      });

      const { user, token } = response.data;
      
      this.setAuthToken(token);
      this.currentUser = user;
      
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  /**
   * Get current authenticated user
   * @returns {Promise<Object|null>} Current user or null
   */
  async getCurrentUser() {
    if (!this.authToken) {
      return null;
    }

    try {
      const response = await this.apiClient.get('/auth/me');
      this.currentUser = response.data;
      return this.currentUser;
    } catch (error) {
      console.error('Failed to get current user:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user
   */
  async register(userData) {
    const { username, email, password, firstName, lastName } = userData;

    if (!validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!validatePassword(password)) {
      throw new Error('Password must be at least 8 characters');
    }

    try {
      const response = await this.apiClient.post('/auth/register', {
        username,
        email,
        password,
        firstName,
        lastName
      });

      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw new Error('Registration failed. Please try again.');
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated user
   */
  async updateProfile(updates) {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      const response = await this.apiClient.put(`/users/${this.currentUser.id}`, updates);
      this.currentUser = { ...this.currentUser, ...response.data };
      return this.currentUser;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(currentPassword, newPassword) {
    if (!validatePassword(newPassword)) {
      throw new Error('New password must be at least 8 characters');
    }

    try {
      await this.apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      return true;
    } catch (error) {
      console.error('Password change failed:', error);
      throw new Error('Failed to change password');
    }
  }

  /**
   * Logout current user
   */
  logout() {
    localStorage.removeItem('authToken');
    this.authToken = null;
    this.currentUser = null;
    this.apiClient.clearAuth();
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!this.authToken && !!this.currentUser;
  }

  /**
   * Set authentication token
   * @private
   * @param {string} token - Auth token
   */
  setAuthToken(token) {
    this.authToken = token;
    localStorage.setItem('authToken', token);
    this.apiClient.setAuthToken(token);
  }

  /**
   * Validate user credentials format
   * @private
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {boolean} Validation result
   */
  validateCredentials(username, password) {
    return username && 
           password && 
           username.length >= 3 && 
           password.length >= 6;
  }

  /**
   * Get user preferences
   * @returns {Promise<Object>} User preferences
   */
  async getPreferences() {
    if (!this.currentUser) {
      return {};
    }

    try {
      const response = await this.apiClient.get(`/users/${this.currentUser.id}/preferences`);
      return response.data;
    } catch (error) {
      console.error('Failed to get preferences:', error);
      return {};
    }
  }

  /**
   * Update user preferences
   * @param {Object} preferences - New preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updatePreferences(preferences) {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      const response = await this.apiClient.put(
        `/users/${this.currentUser.id}/preferences`,
        preferences
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw new Error('Failed to update preferences');
    }
  }
} 