const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Please add a recipient ID'],
    },
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Please add a sender ID'],
    },
    type: {
      type: String,
      enum: [
        'connection-request',
        'connection-accepted',
        'post-like',
        'post-comment',
        'post-share',
        'job-application',
        'job-application-update',
        'message',
        'mention',
      ],
      required: [true, 'Please add a notification type'],
    },
    content: {
      type: String,
      required: [true, 'Please add notification content'],
    },
    referenceId: {
      type: mongoose.Schema.ObjectId,
      refPath: 'onModel',
    },
    onModel: {
      type: String,
      enum: ['Post', 'Job', 'User', 'Message'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster querying
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Static method to create a notification
NotificationSchema.statics.createNotification = async function (data) {
  const notification = await this.create(data);
  return notification.populate('sender', 'name profileImage').execPopulate();
};

// Middleware to set readAt when isRead is set to true
NotificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead) {
    this.readAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema);
