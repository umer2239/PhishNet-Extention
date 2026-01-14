const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/v1/users/me
// @access  Private
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { name, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/v1/users/stats
// @access  Private
exports.getUserStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const stats = {
      safeWebsitesVisitedCount: user.safeWebsitesVisitedCount,
      unsafeUrlsDetectedCount: user.unsafeUrlsDetectedCount,
      protectionEventsCount: user.protectionEventsCount,
      lastLogin: user.lastLogin
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching statistics'
    });
  }
};

// @desc    Increment safe websites count
// @route   POST /api/v1/users/increment-safe-visits
// @access  Private
exports.incrementSafeVisits = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.incrementSafeVisits();

    res.status(200).json({
      success: true,
      message: 'Safe visit count incremented',
      data: {
        safeWebsitesVisitedCount: user.safeWebsitesVisitedCount
      }
    });
  } catch (error) {
    console.error('Increment safe visits error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error incrementing safe visits'
    });
  }
};

// @desc    Increment unsafe URLs detected count
// @route   POST /api/v1/users/increment-unsafe-detected
// @access  Private
exports.incrementUnsafeDetected = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.incrementUnsafeDetected();

    res.status(200).json({
      success: true,
      message: 'Unsafe URLs detected count incremented',
      data: {
        unsafeUrlsDetectedCount: user.unsafeUrlsDetectedCount
      }
    });
  } catch (error) {
    console.error('Increment unsafe detected error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error incrementing unsafe detected count'
    });
  }
};

// @desc    Increment protection events count
// @route   POST /api/v1/users/increment-protection-events
// @access  Private
exports.incrementProtectionEvents = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.incrementProtectionEvents();

    res.status(200).json({
      success: true,
      message: 'Protection events count incremented',
      data: {
        protectionEventsCount: user.protectionEventsCount
      }
    });
  } catch (error) {
    console.error('Increment protection events error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error incrementing protection events'
    });
  }
};
