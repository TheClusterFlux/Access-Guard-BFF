const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const GuestVisit = require('../models/GuestVisit');
const GuestCode = require('../models/GuestCode');
const { validationResult } = require('express-validator');

const router = express.Router();

// @desc    Get guest visits
// @route   GET /api/guest-visits
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { residentId, status, limit = 50, page = 1 } = req.query;
    
    let query = {};
    
    // If user is not admin/security, only show their own visits
    if (req.user.role === 'resident') {
      // Find resident by user ID
      const Resident = require('../models/Resident');
      const resident = await Resident.findOne({ userId: req.user._id });
      if (!resident) {
        return res.status(404).json({
          success: false,
          message: 'Resident profile not found'
        });
      }
      query.resident = resident._id;
    } else if (residentId) {
      query.resident = residentId;
    }
    
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const visits = await GuestVisit.find(query)
      .sort({ visitDate: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('residentData')
      .populate('guestCodeData');
    
    const total = await GuestVisit.countDocuments(query);

    res.json({
      success: true,
      data: visits,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching guest visits:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching guest visits'
    });
  }
});

// @desc    Get active guest visits
// @route   GET /api/guest-visits/active
// @access  Private (security, super_admin)
router.get('/active', protect, authorize('security', 'super_admin'), async (req, res) => {
  try {
    const activeVisits = await GuestVisit.getActiveVisits();
    
    res.json({
      success: true,
      data: activeVisits
    });
  } catch (error) {
    console.error('Error fetching active visits:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active visits'
    });
  }
});

// @desc    Create guest visit
// @route   POST /api/guest-visits
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { guestCodeId, guestName, purpose, vehicleInfo, numberOfGuests } = req.body;
    
    // Find the guest code
    const guestCode = await GuestCode.findById(guestCodeId);
    if (!guestCode) {
      return res.status(404).json({
        success: false,
        message: 'Guest code not found'
      });
    }

    // Verify the guest code belongs to the requesting user (if resident)
    if (req.user.role === 'resident') {
      const Resident = require('../models/Resident');
      const resident = await Resident.findOne({ userId: req.user._id });
      if (!resident || !guestCode.resident.equals(resident._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const visitData = {
      resident: guestCode.resident,
      guestName,
      guestCode: guestCodeId,
      purpose,
      vehicleInfo,
      numberOfGuests: numberOfGuests || 1,
      visitDate: new Date()
    };

    const visit = await GuestVisit.create(visitData);

    res.status(201).json({
      success: true,
      data: visit
    });
  } catch (error) {
    console.error('Error creating guest visit:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating guest visit'
    });
  }
});

// @desc    Check in guest
// @route   PUT /api/guest-visits/:id/checkin
// @access  Private (security, super_admin)
router.put('/:id/checkin', protect, authorize('security', 'super_admin'), async (req, res) => {
  try {
    const visit = await GuestVisit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Guest visit not found'
      });
    }

    await visit.checkIn();

    res.json({
      success: true,
      data: visit
    });
  } catch (error) {
    console.error('Error checking in guest:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking in guest'
    });
  }
});

// @desc    Check out guest
// @route   PUT /api/guest-visits/:id/checkout
// @access  Private (security, super_admin)
router.put('/:id/checkout', protect, authorize('security', 'super_admin'), async (req, res) => {
  try {
    const visit = await GuestVisit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Guest visit not found'
      });
    }

    await visit.checkOut();

    res.json({
      success: true,
      data: visit
    });
  } catch (error) {
    console.error('Error checking out guest:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking out guest'
    });
  }
});

// @desc    Cancel guest visit
// @route   PUT /api/guest-visits/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const visit = await GuestVisit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Guest visit not found'
      });
    }

    // Check permissions
    if (req.user.role === 'resident') {
      const Resident = require('../models/Resident');
      const resident = await Resident.findOne({ userId: req.user._id });
      if (!resident || !visit.resident.equals(resident._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await visit.cancel();

    res.json({
      success: true,
      data: visit
    });
  } catch (error) {
    console.error('Error cancelling guest visit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error cancelling guest visit'
    });
  }
});

module.exports = router; 