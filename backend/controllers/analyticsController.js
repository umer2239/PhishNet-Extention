const Analytics = require('../models/Analytics');

// @desc    Get platform analytics
// @route   GET /api/v1/analytics
// @access  Public
exports.getAnalytics = async (req, res, next) => {
  try {
    const analytics = await Analytics.getAnalytics();

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching analytics'
    });
  }
};

// @desc    Update analytics (manual trigger)
// @route   POST /api/v1/analytics/update
// @access  Private (should be admin only in production)
exports.updateAnalytics = async (req, res, next) => {
  try {
    const analytics = await Analytics.updateAnalytics();

    res.status(200).json({
      success: true,
      message: 'Analytics updated successfully',
      data: analytics
    });
  } catch (error) {
    console.error('Update analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating analytics'
    });
  }
};
