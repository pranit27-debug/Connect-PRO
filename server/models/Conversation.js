const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Please add participants'],
      },
    ],
    lastMessage: {
      type: mongoose.Schema.ObjectId,
      ref: 'Message',
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      maxlength: [50, 'Group name cannot be more than 50 characters'],
    },
    groupImage: {
      type: String,
    },
    groupAdmin: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster querying
ConversationSchema.index({ participants: 1, updatedAt: -1 });

// Middleware to populate participants when querying
ConversationSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'participants',
    select: 'name profileImage headline',
  }).populate({
    path: 'lastMessage',
    select: 'content sender createdAt',
    populate: {
      path: 'sender',
      select: 'name profileImage',
    },
  });
  next();
});

// Static method to find or create a conversation
ConversationSchema.statics.findOrCreateConversation = async function (user1Id, user2Id) {
  // Check if conversation already exists between these two users
  let conversation = await this.findOne({
    participants: { $all: [user1Id, user2Id], $size: 2 },
    isGroup: false,
  });

  // If no conversation exists, create a new one
  if (!conversation) {
    conversation = await this.create({
      participants: [user1Id, user2Id],
    });
  }

  return conversation;
};

module.exports = mongoose.model('Conversation', ConversationSchema);
