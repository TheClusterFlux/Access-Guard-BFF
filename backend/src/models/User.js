const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please add a valid phone number']
  },
  role: {
    type: String,
    enum: ['resident', 'admin', 'security', 'super_admin'],
    default: 'resident'
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Virtual for password (not stored in DB)
userSchema.virtual('password')
  .set(function(password) {
    this.passwordHash = bcrypt.hashSync(password, 12);
  });

// Method to check password
userSchema.methods.matchPassword = function(enteredPassword) {
  return bcrypt.compareSync(enteredPassword, this.passwordHash);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

// Pre-save middleware to hash password
userSchema.pre('save', function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  next();
});

module.exports = mongoose.model('User', userSchema); 