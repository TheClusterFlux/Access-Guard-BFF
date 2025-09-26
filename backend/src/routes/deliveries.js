const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Delivery = require('../models/Delivery');
const Resident = require('../models/Resident');

const router = express.Router();

// @desc    Get deliveries
// @route   GET /api/deliveries
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    
    // Residents can only see their own deliveries
    if (req.user.role === 'resident') {
      const resident = await Resident.findOne({ userId: req.user.id });
      if (!resident) {
        return res.status(404).json({ success: false, error: 'Resident profile not found' });
      }
      query.resident = resident._id;
    }
    
    const deliveries = await Delivery.find(query)
      .populate('residentData', 'unitNumber block')
      .populate('authorizedByData', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: deliveries
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Create new delivery authorization
// @route   POST /api/deliveries
// @access  Private (Residents only)
router.post('/', protect, authorize('resident'), async (req, res) => {
  try {
    const { company, trackingNumber, expectedDate, notes } = req.body;
    
    // Validate required fields
    if (!company || !expectedDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company and expected date are required' 
      });
    }
    
    // Get resident profile
    const resident = await Resident.findOne({ userId: req.user.id });
    if (!resident) {
      return res.status(404).json({ success: false, error: 'Resident profile not found' });
    }
    
    // Create delivery
    const delivery = await Delivery.create({
      resident: resident._id,
      deliveryCompany: company,
      trackingNumber: trackingNumber || '',
      authorizedBy: req.user._id,
      expectedDate: new Date(expectedDate),
      notes: notes || '',
      status: 'authorized'
    });
    
    res.status(201).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Update delivery status (for security)
// @route   PUT /api/deliveries/:id/status
// @access  Private (Security only)
router.put('/:id/status', protect, authorize('security', 'super_admin'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['authorized', 'delivered', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    const delivery = await Delivery.findById(req.params.id)
      .populate('residentData')
      .populate('authorizedByData', 'name email phone');
    
    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }
    
    delivery.status = status;
    if (status === 'delivered') {
      delivery.deliveredAt = new Date();
    }
    await delivery.save();
    
    res.json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Get pending deliveries (for security)
// @route   GET /api/deliveries/pending
// @access  Private (Security only)
router.get('/pending', protect, authorize('security', 'super_admin'), async (req, res) => {
  try {
    const deliveries = await Delivery.getPendingDeliveries();
    
    res.json({
      success: true,
      data: deliveries
    });
  } catch (error) {
    console.error('Error fetching pending deliveries:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router; 