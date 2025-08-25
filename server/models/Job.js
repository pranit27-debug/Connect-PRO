const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a job title'],
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    company: {
      type: String,
      required: [true, 'Please add a company name'],
    },
    location: {
      type: String,
      required: [true, 'Please add a location'],
    },
    description: {
      type: String,
      required: [true, 'Please add a job description'],
    },
    requirements: {
      type: [String],
      required: [true, 'Please add job requirements'],
    },
    responsibilities: {
      type: [String],
      required: [true, 'Please add job responsibilities'],
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Volunteer'],
      default: 'Full-time',
    },
    experienceLevel: {
      type: String,
      enum: ['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Manager', 'Executive'],
      default: 'Mid Level',
    },
    salary: {
      min: {
        type: Number,
      },
      max: {
        type: Number,
      },
      currency: {
        type: String,
        default: 'USD',
      },
      period: {
        type: String,
        enum: ['hour', 'week', 'month', 'year'],
        default: 'year',
      },
      isPublic: {
        type: Boolean,
        default: true,
      },
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    isRemote: {
      type: Boolean,
      default: false,
    },
    applicationDeadline: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applications: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        resume: {
          type: String,
          required: [true, 'Please upload a resume'],
        },
        coverLetter: {
          type: String,
        },
        status: {
          type: String,
          enum: ['pending', 'reviewing', 'accepted', 'rejected'],
          default: 'pending',
        },
        appliedAt: {
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

// Reverse populate with virtuals
JobSchema.virtual('applicationsCount').get(function () {
  return this.applications.length;
});

// Cascade delete applications when a job is deleted
JobSchema.pre('remove', async function (next) {
  console.log(`Job applications being removed for job ${this._id}`);
  await this.model('Application').deleteMany({ job: this._id });
  next();
});

module.exports = mongoose.model('Job', JobSchema);
