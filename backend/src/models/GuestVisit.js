const mongoose = require('mongoose');

const guestVisitSchema = new mongoose.Schema({
  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: [true, 'Resident ID is required']
  },
  guestName: {
    type: String,
    required: [true, 'Guest name is required'],
    trim: true,
    maxlength: [100, 'Guest name cannot be more than 100 characters']
  },
  guestCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuestCode',
    required: [true, 'Guest code ID is required']
  },
  visitDate: {
    type: Date,
    required: [true, 'Visit date is required'],
    default: Date.now
  },
  checkInTime: {
    type: Date,
    default: null
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  vehicleInfo: {
    make: String,
    model: String,
    color: String,
    plateNumber: String
  },
  numberOfGuests: {
    type: Number,
    default: 1,
    min: [1, 'Number of guests must be at least 1']
  },
  purpose: {
    type: String,
    trim: true,
    maxlength: [200, 'Purpose cannot be more than 200 characters']
  },
  status: {
    type: String,
    enum: ['scheduled', 'arrived', 'departed', 'cancelled'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  securityNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Security notes cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
guestVisitSchema.index({ resident: 1, visitDate: -1 });
guestVisitSchema.index({ guestCode: 1 });
guestVisitSchema.index({ status: 1 });
guestVisitSchema.index({ checkInTime: 1 });
guestVisitSchema.index({ checkOutTime: 1 });

// Virtual populate for resident data
guestVisitSchema.virtual('residentData', {
  ref: 'Resident',
  localField: 'resident',
  foreignField: '_id',
  justOne: true
});

// Virtual populate for guest code data
guestVisitSchema.virtual('guestCodeData', {
  ref: 'GuestCode',
  localField: 'guestCode',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
guestVisitSchema.set('toJSON', { virtuals: true });
guestVisitSchema.set('toObject', { virtuals: true });

// Method to check in guest
guestVisitSchema.methods.checkIn = function() {
  if (this.status !== 'scheduled') {
    throw new Error('Guest can only check in from scheduled status');
  }
  
  this.status = 'arrived';
  this.checkInTime = new Date();
  return this.save();
};

// Method to check out guest
guestVisitSchema.methods.checkOut = function() {
  if (this.status !== 'arrived') {
    throw new Error('Guest can only check out from arrived status');
  }
  
  this.status = 'departed';
  this.checkOutTime = new Date();
  return this.save();
};

// Method to cancel visit
guestVisitSchema.methods.cancel = function() {
  if (this.status === 'departed') {
    throw new Error('Cannot cancel a completed visit');
  }
  
  this.status = 'cancelled';
  return this.save();
};

// Static method to get active visits
guestVisitSchema.statics.getActiveVisits = function() {
  return this.find({
    status: { $in: ['scheduled', 'arrived'] }
  }).populate('residentData').populate('guestCodeData');
};

// Static method to get visits by resident
guestVisitSchema.statics.getVisitsByResident = function(residentId, limit = 50) {
  return this.find({ resident: residentId })
    .sort({ visitDate: -1 })
    .limit(limit)
    .populate('guestCodeData');
};

module.exports = mongoose.model('GuestVisit', guestVisitSchema);
