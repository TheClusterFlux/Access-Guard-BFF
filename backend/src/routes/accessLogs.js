const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const AccessLog = require('../models/AccessLog');
const { validationResult } = require('express-validator');

const router = express.Router();

// @desc    Get access logs
// @route   GET /api/access-logs
// @access  Private (security, super_admin)
router.get('/', protect, authorize('security', 'super_admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      result,
      method,
      accessPoint,
      userId
    } = req.query;

    // Build filter object
    const filters = {};
    
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }
    
    if (result) filters.result = result;
    if (method) filters.method = method;
    if (accessPoint) filters.accessPoint = accessPoint;
    if (userId) filters.user = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const logs = await AccessLog.getAccessLogs(filters, parseInt(limit), skip);
    const total = await AccessLog.countDocuments(filters);

    res.json({
      success: true,
      data: logs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching access logs'
    });
  }
});

// @desc    Get access statistics
// @route   GET /api/access-logs/statistics
// @access  Private (security, super_admin)
router.get('/statistics', protect, authorize('security', 'super_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const statistics = await AccessLog.getAccessStatistics(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching access statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching access statistics'
    });
  }
});

// @desc    Log access attempt
// @route   POST /api/access-logs
// @access  Private (security, super_admin)
router.post('/', protect, authorize('security', 'super_admin'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const logData = {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const accessLog = await AccessLog.logAccess(logData);

    res.status(201).json({
      success: true,
      data: accessLog
    });
  } catch (error) {
    console.error('Error creating access log:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating access log'
    });
  }
});

module.exports = router; 