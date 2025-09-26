const mongoose = require('mongoose');
const crypto = require('crypto');

const guestCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Code is required'],
    unique: true,
    trim: true
  },
  codeType: {
    type: String,
    enum: ['QR', 'PIN'],
    required: [true, 'Code type is required']
  },
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
  purpose: {
    type: String,
    trim: true,
    maxlength: [200, 'Purpose cannot be more than 200 characters']
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'revoked'],
    default: 'active'
  },
  usedAt: {
    type: Date,
    default: null
  },
  revokedAt: {
    type: Date,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  maxUsage: {
    type: Number,
    default: 1,
    min: [1, 'Max usage must be at least 1']
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
guestCodeSchema.index({ code: 1 }, { unique: true });
guestCodeSchema.index({ resident: 1 });
guestCodeSchema.index({ validUntil: 1 });
guestCodeSchema.index({ status: 1 });
guestCodeSchema.index({ codeType: 1 });

// Virtual populate for resident data
guestCodeSchema.virtual('residentData', {
  ref: 'Resident',
  localField: 'resident',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
guestCodeSchema.set('toJSON', { virtuals: true });
guestCodeSchema.set('toObject', { virtuals: true });

// Static method to generate code based on type
guestCodeSchema.statics.generateCode = async function(codeType) {
  let code;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    if (codeType === 'PIN') {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } else if (codeType === 'QR') {
      code = 'QR_' + crypto.randomBytes(8).toString('hex').toUpperCase();
    } else {
      throw new Error('Invalid code type');
    }
    
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error('Unable to generate unique code after maximum attempts');
    }
  } while (await this.findOne({ code }));
  
  return code;
};

// Method to check if code is valid
guestCodeSchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'active' && 
         now >= this.validFrom && 
         now <= this.validUntil && 
         this.usageCount < this.maxUsage;
};

// Method to use the code
guestCodeSchema.methods.use = function() {
  if (!this.isValid()) {
    throw new Error('Code is not valid');
  }
  
  this.usageCount += 1;
  this.usedAt = new Date();
  if (this.usageCount >= this.maxUsage) {
    this.status = 'used';
  }
  
  return this.save();
};

// Method to revoke the code
guestCodeSchema.methods.revoke = function() {
  this.status = 'revoked';
  this.revokedAt = new Date();
  return this.save();
};

// Pre-save middleware to set status to expired if past validUntil
guestCodeSchema.pre('save', function(next) {
  if (this.validUntil && new Date() > this.validUntil && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('GuestCode', guestCodeSchema); 