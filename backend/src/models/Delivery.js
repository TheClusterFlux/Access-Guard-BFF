const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: [true, 'Resident ID is required']
  },
  deliveryCompany: {
    type: String,
    required: [true, 'Delivery company is required'],
    trim: true,
    maxlength: [100, 'Company name cannot be more than 100 characters']
  },
  trackingNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Tracking number cannot be more than 50 characters']
  },
  authorizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Authorized by user ID is required']
  },
  expectedDate: {
    type: Date,
    required: [true, 'Expected date is required']
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['authorized', 'delivered', 'failed', 'cancelled'],
    default: 'authorized'
  },
  items: [{
    description: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1']
    }
  }],
  deliveryPerson: {
    name: String,
    phone: String,
    company: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
deliverySchema.index({ resident: 1, status: 1 });
deliverySchema.index({ expectedDate: 1 });
deliverySchema.index({ status: 1, expectedDate: 1 });
deliverySchema.index({ authorizedBy: 1 });
deliverySchema.index({ trackingNumber: 1 });

// Virtual populate for related data
deliverySchema.virtual('residentData', {
  ref: 'Resident',
  localField: 'resident',
  foreignField: '_id',
  justOne: true
});

deliverySchema.virtual('authorizedByData', {
  ref: 'User',
  localField: 'authorizedBy',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
deliverySchema.set('toJSON', { virtuals: true });
deliverySchema.set('toObject', { virtuals: true });

// Method to mark as delivered
deliverySchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

// Method to mark as failed
deliverySchema.methods.markAsFailed = function() {
  this.status = 'failed';
  return this.save();
};

// Method to cancel delivery
deliverySchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Static method to get deliveries by resident
deliverySchema.statics.getDeliveriesByResident = function(residentId, limit = 50) {
  return this.find({ resident: residentId })
    .sort({ expectedDate: -1 })
    .limit(limit)
    .populate('authorizedByData', 'name email');
};

// Static method to get pending deliveries
deliverySchema.statics.getPendingDeliveries = function() {
  return this.find({ 
    status: 'authorized',
    expectedDate: { $lte: new Date() }
  })
  .populate('residentData')
  .populate('authorizedByData', 'name email');
};

module.exports = mongoose.model('Delivery', deliverySchema); 