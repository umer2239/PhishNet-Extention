const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  validateUrl,
  validateUrlStatus,
  handleValidationErrors
} = require('../utils/validators');
const {
  checkUrl,
  getUrlHistory,
  getUnsafeUrls,
  checkUrlHistory,
  updateUrlStatus,
  deleteUrlRecord
} = require('../controllers/urlController');

// @route   POST /api/v1/urls/check
// @desc    Check and record URL
// @access  Private
router.post('/check', authenticate, validateUrl, handleValidationErrors, checkUrl);

// @route   GET /api/v1/urls/history
// @desc    Get user's URL check history
// @access  Private
router.get('/history', authenticate, getUrlHistory);

// @route   GET /api/v1/urls/unsafe
// @desc    Get user's unsafe URLs
// @access  Private
router.get('/unsafe', authenticate, getUnsafeUrls);

// @route   GET /api/v1/urls/check-history/:url
// @desc    Check URL history for specific URL
// @access  Private
router.get('/check-history/:url', authenticate, checkUrlHistory);

// @route   PUT /api/v1/urls/:id
// @desc    Update URL check status
// @access  Private
router.put('/:id', authenticate, validateUrlStatus, handleValidationErrors, updateUrlStatus);

// @route   DELETE /api/v1/urls/:id
// @desc    Delete URL record
// @access  Private
router.delete('/:id', authenticate, deleteUrlRecord);

module.exports = router;
