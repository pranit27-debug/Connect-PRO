const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'recruiter', 'admin'],
      default: 'user',
    },
    headline: {
      type: String,
      maxlength: [100, 'Headline cannot be more than 100 characters'],
    },
    about: {
      type: String,
      maxlength: [1000, 'About cannot be more than 1000 characters'],
    },
    location: {
      type: String,
    },
    website: {
      type: String,
    },
    profileImage: {
      type: String,
      default: 'default.jpg',
    },
    coverImage: {
      type: String,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    experience: [
      {
        title: {
          type: String,
          required: [true, 'Please add a title'],
        },
        company: {
          type: String,
          required: [true, 'Please add a company'],
        },
        location: {
          type: String,
        },
        from: {
          type: Date,
          required: [true, 'Please add a start date'],
        },
        to: {
          type: Date,
        },
        current: {
          type: Boolean,
          default: false,
        },
        description: {
          type: String,
        },
      },
    ],
    education: [
      {
        school: {
          type: String,
          required: [true, 'Please add a school'],
        },
        degree: {
          type: String,
          required: [true, 'Please add a degree'],
        },
        fieldofstudy: {
          type: String,
          required: [true, 'Please add a field of study'],
        },
        from: {
          type: Date,
          required: [true, 'Please add a start date'],
        },
        to: {
          type: Date,
        },
        current: {
          type: Boolean,
          default: false,
        },
        description: {
          type: String,
        },
      },
    ],
    social: {
      youtube: {
        type: String,
      },
      twitter: {
        type: String,
      },
      facebook: {
        type: String,
      },
      linkedin: {
        type: String,
      },
      instagram: {
        type: String,
      },
    },
    connections: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'accepted'],
          default: 'pending',
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Cascade delete posts when a user is deleted
userSchema.pre('remove', async function (next) {
  await this.model('Post').deleteMany({ user: this._id });
  next();
});

// Reverse populate with virtuals
userSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'user',
  justOne: false,
});

module.exports = mongoose.model('User', userSchema);
