const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all residents
// @route   GET /api/residents
// @access  Private (admin, security, super_admin)
router.get('/', protect, authorize('admin', 'security', 'super_admin'), async (req, res) => {
  res.json({
    success: true,
    message: 'Residents route - to be implemented'
  });
});

module.exports = router; 