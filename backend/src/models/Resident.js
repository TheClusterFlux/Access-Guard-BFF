const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Emergency contact name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Emergency contact phone is required'],
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please add a valid phone number']
  },
  relationship: {
    type: String,
    required: [true, 'Relationship is required'],
    trim: true
  }
});

const vehicleInfoSchema = new mongoose.Schema({
  make: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  plateNumber: {
    type: String,
    trim: true,
    uppercase: true
  }
});

const residentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  unitNumber: {
    type: String,
    required: [true, 'Unit number is required'],
    trim: true,
    uppercase: true
  },
  block: {
    type: String,
    required: [true, 'Block is required'],
    trim: true
  },
  vehicleInfo: vehicleInfoSchema,
  emergencyContacts: [emergencyContactSchema],
  profilePhoto: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  moveInDate: {
    type: Date,
    default: Date.now
  },
  moveOutDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
residentSchema.index({ userId: 1 }, { unique: true });
residentSchema.index({ unitNumber: 1 });
residentSchema.index({ block: 1 });
residentSchema.index({ status: 1 });

// Virtual populate for user data
residentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
residentSchema.set('toJSON', { virtuals: true });
residentSchema.set('toObject', { virtuals: true });

// Method to get public profile
residentSchema.methods.getPublicProfile = function() {
  const residentObject = this.toObject();
  if (residentObject.user) {
    delete residentObject.user.passwordHash;
    delete residentObject.user.passwordResetToken;
    delete residentObject.user.passwordResetExpires;
  }
  return residentObject;
};

module.exports = mongoose.model('Resident', residentSchema); 