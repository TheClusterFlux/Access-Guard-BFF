const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const GuestCode = require('../models/GuestCode');
const Resident = require('../models/Resident');

const router = express.Router();

// @desc    Get guest codes for current user
// @route   GET /api/guest-codes
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    
    // Residents can only see their own codes
    if (req.user.role === 'resident') {
      const resident = await Resident.findOne({ userId: req.user.id });
      if (!resident) {
        return res.status(404).json({ success: false, error: 'Resident profile not found' });
      }
      query.resident = resident._id;
    }
    
    const guestCodes = await GuestCode.find(query)
      .populate('resident', 'unitNumber block')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: guestCodes
    });
  } catch (error) {
    console.error('Error fetching guest codes:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Create new guest code
// @route   POST /api/guest-codes
// @access  Private (Residents only)
router.post('/', protect, authorize('resident'), async (req, res) => {
  try {
    const { guestName, codeType, validUntil, purpose } = req.body;
    
    // Validate required fields
    if (!guestName || !codeType || !validUntil) {
      return res.status(400).json({ 
        success: false, 
        error: 'Guest name, code type, and valid until date are required' 
      });
    }
    
    // Get resident profile
    const resident = await Resident.findOne({ userId: req.user.id });
    if (!resident) {
      return res.status(404).json({ success: false, error: 'Resident profile not found' });
    }
    
    // Generate code
    const code = await GuestCode.generateCode(codeType);
    
    // Create guest code
    const guestCode = await GuestCode.create({
      resident: resident._id,
      guestName,
      codeType,
      code,
      validFrom: new Date(),
      validUntil: new Date(validUntil),
      purpose: purpose || '',
      status: 'active'
    });
    
    res.status(201).json({
      success: true,
      data: guestCode
    });
  } catch (error) {
    console.error('Error creating guest code:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Verify guest code (for security)
// @route   POST /api/guest-codes/verify
// @access  Private (Security only)
router.post('/verify', protect, authorize('security', 'super_admin'), async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code is required' });
    }
    
    const guestCode = await GuestCode.findOne({ code, status: 'active' })
      .populate('resident', 'unitNumber block user')
      .populate('resident.user', 'name email phone');
    
    if (!guestCode) {
      return res.status(404).json({ success: false, error: 'Invalid or expired code' });
    }
    
    // Check if code is still valid
    const now = new Date();
    if (now < guestCode.validFrom || now > guestCode.validUntil) {
      return res.status(400).json({ success: false, error: 'Code has expired' });
    }
    
    // Mark code as used
    guestCode.status = 'used';
    guestCode.usedAt = now;
    await guestCode.save();
    
    res.json({
      success: true,
      data: {
        guestName: guestCode.guestName,
        resident: guestCode.resident,
        purpose: guestCode.purpose
      }
    });
  } catch (error) {
    console.error('Error verifying guest code:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Revoke guest code
// @route   PUT /api/guest-codes/:id/revoke
// @access  Private (Residents can revoke their own codes)
router.put('/:id/revoke', protect, async (req, res) => {
  try {
    const guestCode = await GuestCode.findById(req.params.id)
      .populate('resident', 'userId');
    
    if (!guestCode) {
      return res.status(404).json({ success: false, error: 'Guest code not found' });
    }
    
    // Check if user can revoke this code
    if (req.user.role === 'resident' && guestCode.resident.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to revoke this code' });
    }
    
    guestCode.status = 'revoked';
    guestCode.revokedAt = new Date();
    await guestCode.save();
    
    res.json({
      success: true,
      data: guestCode
    });
  } catch (error) {
    console.error('Error revoking guest code:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router; 