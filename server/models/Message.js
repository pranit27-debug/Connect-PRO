const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.ObjectId,
      ref: 'Conversation',
      required: [true, 'Please add a conversation ID'],
    },
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Please add a sender ID'],
    },
    content: {
      type: String,
      required: [true, 'Please add message content'],
      maxlength: [2000, 'Message cannot be more than 2000 characters'],
    },
    attachments: [
      {
        type: String,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster querying
MessageSchema.index({ conversation: 1, createdAt: 1 });

// Middleware to populate sender when querying
MessageSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'sender',
    select: 'name profileImage',
  });
  next();
});

module.exports = mongoose.model('Message', MessageSchema);
