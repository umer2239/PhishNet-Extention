const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getCurrentUser,
  updateProfile,
  getUserStats,
  incrementSafeVisits,
  incrementUnsafeDetected,
  incrementProtectionEvents,
  saveSettings,
  getSettings
} = require('../controllers/userController');

// @route   GET /api/v1/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticate, getCurrentUser);

// @route   PUT /api/v1/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, updateProfile);

// @route   GET /api/v1/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', authenticate, getUserStats);

// @route   POST /api/v1/users/increment-safe-visits
// @desc    Increment safe websites visited count
// @access  Private
router.post('/increment-safe-visits', authenticate, incrementSafeVisits);

// @route   POST /api/v1/users/increment-unsafe-detected
// @desc    Increment unsafe URLs detected count
// @access  Private
router.post('/increment-unsafe-detected', authenticate, incrementUnsafeDetected);

// @route   POST /api/v1/users/increment-protection-events
// @desc    Increment protection events count
// @access  Private
router.post('/increment-protection-events', authenticate, incrementProtectionEvents);

// @route   POST /api/v1/users/settings
// @desc    Save user settings and profile picture
// @access  Private
router.post('/settings', authenticate, saveSettings);

// @route   GET /api/v1/users/settings
// @desc    Get user settings and profile picture
// @access  Private
router.get('/settings', authenticate, getSettings);

module.exports = router;
