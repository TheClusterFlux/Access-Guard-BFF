const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Can be null for guest access
  },
  guestCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuestCode',
    default: null
  },
  visit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuestVisit',
    default: null
  },
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    default: null
  },
  timestamp: {
    type: Date,
    required: [true, 'Timestamp is required'],
    default: Date.now
  },
  accessPoint: {
    type: String,
    required: [true, 'Access point is required'],
    enum: ['main_gate', 'side_gate', 'emergency_exit', 'delivery_entrance'],
    default: 'main_gate'
  },
  result: {
    type: String,
    required: [true, 'Result is required'],
    enum: ['success', 'failure', 'denied'],
    default: 'success'
  },
  method: {
    type: String,
    required: [true, 'Access method is required'],
    enum: ['QR', 'PIN', 'manual', 'keycard', 'biometric'],
    default: 'manual'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
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
accessLogSchema.index({ timestamp: -1 });
accessLogSchema.index({ user: 1, timestamp: -1 });
accessLogSchema.index({ guestCode: 1 });
accessLogSchema.index({ visit: 1 });
accessLogSchema.index({ delivery: 1 });
accessLogSchema.index({ accessPoint: 1, timestamp: -1 });
accessLogSchema.index({ result: 1, timestamp: -1 });
accessLogSchema.index({ method: 1, timestamp: -1 });

// Virtual populate for related data
accessLogSchema.virtual('userData', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

accessLogSchema.virtual('guestCodeData', {
  ref: 'GuestCode',
  localField: 'guestCode',
  foreignField: '_id',
  justOne: true
});

accessLogSchema.virtual('visitData', {
  ref: 'GuestVisit',
  localField: 'visit',
  foreignField: '_id',
  justOne: true
});

accessLogSchema.virtual('deliveryData', {
  ref: 'Delivery',
  localField: 'delivery',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
accessLogSchema.set('toJSON', { virtuals: true });
accessLogSchema.set('toObject', { virtuals: true });

// Static method to log access attempt
accessLogSchema.statics.logAccess = async function(data) {
  const logData = {
    timestamp: new Date(),
    ...data
  };
  
  return this.create(logData);
};

// Static method to log guest access
accessLogSchema.statics.logGuestAccess = async function(guestCodeId, visitId, result, method, details = {}) {
  return this.logAccess({
    guestCode: guestCodeId,
    visit: visitId,
    result,
    method,
    details
  });
};

// Static method to log resident access
accessLogSchema.statics.logResidentAccess = async function(userId, result, method, details = {}) {
  return this.logAccess({
    user: userId,
    result,
    method,
    details
  });
};

// Static method to log delivery access
accessLogSchema.statics.logDeliveryAccess = async function(deliveryId, result, method, details = {}) {
  return this.logAccess({
    delivery: deliveryId,
    result,
    method,
    details
  });
};

// Static method to get access logs with filters
accessLogSchema.statics.getAccessLogs = function(filters = {}, limit = 100, skip = 0) {
  const query = this.find(filters)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userData', 'name email role')
    .populate('guestCodeData', 'guestName codeType')
    .populate('visitData', 'guestName purpose')
    .populate('deliveryData', 'company trackingNumber');
  
  return query;
};

// Static method to get access statistics
accessLogSchema.statics.getAccessStatistics = function(startDate, endDate) {
  const matchStage = {
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          result: '$result',
          method: '$method',
          accessPoint: '$accessPoint'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.result',
        methods: {
          $push: {
            method: '$_id.method',
            accessPoint: '$_id.accessPoint',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);
};

module.exports = mongoose.model('AccessLog', accessLogSchema);
