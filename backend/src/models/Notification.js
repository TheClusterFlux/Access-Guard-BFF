const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    enum: ['info', 'alert', 'emergency', 'success', 'warning'],
    default: 'info'
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired notifications

// Virtual populate for user data
notificationSchema.virtual('userData', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Method to check if notification is expired
notificationSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Static method to create system notification
notificationSchema.statics.createSystemNotification = async function(userId, type, title, message, data = {}) {
  return this.create({
    user: userId,
    type,
    title,
    message,
    data,
    read: false
  });
};

// Static method to create guest arrival notification
notificationSchema.statics.createGuestArrivalNotification = async function(residentId, guestName, guestCode) {
  return this.create({
    user: residentId,
    type: 'info',
    title: 'Guest Arrival',
    message: `${guestName} has arrived at the main gate using code ${guestCode}`,
    data: {
      guestName,
      guestCode,
      eventType: 'guest_arrival'
    },
    read: false
  });
};

// Static method to create delivery notification
notificationSchema.statics.createDeliveryNotification = async function(residentId, company, trackingNumber) {
  return this.create({
    user: residentId,
    type: 'alert',
    title: 'Delivery Scheduled',
    message: `${company} delivery scheduled${trackingNumber ? ` (${trackingNumber})` : ''}`,
    data: {
      company,
      trackingNumber,
      eventType: 'delivery_scheduled'
    },
    read: false
  });
};

// Static method to create delivery completed notification
notificationSchema.statics.createDeliveryCompletedNotification = async function(residentId, company) {
  return this.create({
    user: residentId,
    type: 'success',
    title: 'Delivery Completed',
    message: `${company} delivery has been completed`,
    data: {
      company,
      eventType: 'delivery_completed'
    },
    read: false
  });
};

module.exports = mongoose.model('Notification', notificationSchema); 