const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Resident = require('../models/Resident');
const bcrypt = require('bcryptjs');

const router = express.Router();

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private (admin, super_admin)
router.get('/', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const users = await User.find({})
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    
    // Get resident profiles for resident users
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        if (user.role === 'resident') {
          const residentProfile = await Resident.findOne({ userId: user._id });
          if (residentProfile) {
            userObj.unitNumber = residentProfile.unitNumber;
            userObj.block = residentProfile.block;
          }
        }
        return userObj;
      })
    );
    
    res.json({
      success: true,
      data: usersWithProfiles
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Create new user (admin only)
// @route   POST /api/users
// @access  Private (admin, super_admin)
router.post('/', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, email, phone, role, password, unitNumber, block } = req.body;
    
    // Validate required fields
    if (!name || !email || !role || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, email, role, and password are required' 
      });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }
    
    // Validate role permissions
    if (req.user.role === 'admin' && role === 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admins cannot create super admin users' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      name,
      email,
      phone: phone || '',
      role,
      passwordHash,
      status: 'active'
    });
    
    // If user is a resident, create resident profile
    if (role === 'resident' && unitNumber && block) {
      await Resident.create({
        userId: user._id,
        unitNumber,
        block,
        status: 'active'
      });
    }
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    
    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Update own profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'User with this email already exists' 
        });
      }
    }
    
    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    
    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    
    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Update user (admin only)
// @route   PUT /api/users/:id
// @access  Private (admin, super_admin)
router.put('/:id', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, email, phone, role, status, unitNumber, block } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'User with this email already exists' 
        });
      }
    }
    
    // Validate role permissions
    if (req.user.role === 'admin' && role === 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admins cannot promote users to super admin' 
      });
    }
    
    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role) user.role = role;
    if (status) user.status = status;
    
    await user.save();
    
    // Update resident profile if needed
    if (role === 'resident' && unitNumber && block) {
      await Resident.findOneAndUpdate(
        { userId: user._id },
        { unitNumber, block },
        { upsert: true, new: true }
      );
    }
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    
    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private (admin, super_admin)
router.delete('/:id', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Prevent self-deletion
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete your own account' 
      });
    }
    
    // Prevent admin from deleting super admin
    if (req.user.role === 'admin' && user.role === 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admins cannot delete super admin users' 
      });
    }
    
    // Delete resident profile if exists
    if (user.role === 'resident') {
      await Resident.findOneAndDelete({ userId: user._id });
    }
    
    // Delete user
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @desc    Get user by ID (admin only)
// @route   GET /api/users/:id
// @access  Private (admin, super_admin)
router.get('/:id', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Get resident profile if exists
    let residentProfile = null;
    if (user.role === 'resident') {
      residentProfile = await Resident.findOne({ userId: user._id });
    }
    
    res.json({
      success: true,
      data: {
        user,
        residentProfile
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router; 