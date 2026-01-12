// PhishNet Extension API Service
// Handles all backend API communication with JWT authentication

const API_BASE_URL = 'https://backend-phishnet.onrender.com/api/v1';
const TOKEN_KEY = 'phishnet_token';

class ExtensionAPIService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from chrome storage
  async getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get([TOKEN_KEY], (result) => {
        resolve(result[TOKEN_KEY] || null);
      });
    });
  }

  // Set auth token in chrome storage
  async setToken(token) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [TOKEN_KEY]: token }, resolve);
    });
  }

  // Remove auth token
  async removeToken() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([TOKEN_KEY], resolve);
    });
  }

  // Make authenticated API request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    };

    // Add auth token if available
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ==================== AUTH ENDPOINTS ====================
  
  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (response.success && response.token) {
      await this.setToken(response.token);
    }
    
    return response;
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.success && response.token) {
      await this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.removeToken();
    }
  }

  async getProfile() {
    return await this.request('/auth/me', {
      method: 'GET'
    });
  }

  async updateProfile(profileData) {
    return await this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async changePassword(passwordData) {
    return await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  }

  async deleteAccount() {
    const response = await this.request('/auth/me', {
      method: 'DELETE'
    });
    await this.removeToken();
    return response;
  }

  // ==================== SCAN ENDPOINTS ====================
  
  async createScan(scanData) {
    return await this.request('/scans', {
      method: 'POST',
      body: JSON.stringify(scanData)
    });
  }

  async getScans(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/scans?${queryString}` : '/scans';
    return await this.request(endpoint, {
      method: 'GET'
    });
  }

  async getScanById(scanId) {
    return await this.request(`/scans/${scanId}`, {
      method: 'GET'
    });
  }

  async getScanStats() {
    return await this.request('/scans/stats', {
      method: 'GET'
    });
  }

  async getRecentScans(limit = 10) {
    return await this.request(`/scans/recent?limit=${limit}`, {
      method: 'GET'
    });
  }

  // ==================== SETTINGS ENDPOINTS ====================
  
  async getSettings() {
    return await this.request('/settings', {
      method: 'GET'
    });
  }

  async updateSettings(settingsData) {
    return await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData)
    });
  }

  // ==================== HELPER METHODS ====================
  
  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  }

  async verifyAuth() {
    if (!(await this.isAuthenticated())) {
      return false;
    }

    try {
      await this.getProfile();
      return true;
    } catch (error) {
      await this.removeToken();
      return false;
    }
  }
}

// Create and export singleton instance
const extensionAPI = new ExtensionAPIService();
