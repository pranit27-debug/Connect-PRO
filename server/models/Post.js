const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Please add some text'],
      maxlength: [1000, 'Post cannot be more than 1000 characters'],
    },
    image: {
      type: String,
    },
    likes: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        text: {
          type: String,
          required: true,
          maxlength: [500, 'Comment cannot be more than 500 characters'],
        },
        name: {
          type: String,
        },
        avatar: {
          type: String,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    shares: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
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

// Reverse populate with virtuals
PostSchema.virtual('commentsCount').get(function () {
  return this.comments.length;
});

PostSchema.virtual('likesCount').get(function () {
  return this.likes.length;
});

PostSchema.virtual('sharesCount').get(function () {
  return this.shares.length;
});

module.exports = mongoose.model('Post', PostSchema);
