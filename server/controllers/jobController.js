const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
exports.getJobs = async (req, res) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    let query = Job.find(JSON.parse(queryStr)).populate('user', 'name profileImage');

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Job.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const jobs = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: jobs.length,
      pagination,
      data: jobs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('user', 'name profileImage');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create job
// @route   POST /api/jobs
// @access  Private
exports.createJob = async (req, res) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;

    // Check for published job
    const publishedJob = await Job.findOne({ user: req.user.id });

    // If the user is not an admin, they can only add one job
    if (publishedJob && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'User already has a job listing' });
    }

    const job = await Job.create(req.body);

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private
exports.updateJob = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Make sure user is job owner or admin
    if (job.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'User not authorized' });
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Make sure user is job owner or admin
    if (job.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await job.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Apply for a job
// @route   POST /api/jobs/:id/apply
// @access  Private
exports.applyForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    const user = await User.findById(req.user.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user has already applied
    if (
      job.applications.some(
        (application) => application.user.toString() === req.user.id
      )
    ) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    // Create application
    const newApplication = {
      user: req.user.id,
      resume: req.body.resume,
      coverLetter: req.body.coverLetter || '',
      status: 'pending',
      appliedAt: Date.now(),
    };

    job.applications.unshift(newApplication);
    await job.save();

    // Create notification for job poster
    await Notification.create({
      recipient: job.user,
      sender: req.user.id,
      type: 'job-application',
      content: `${user.name} applied for your ${job.title} position`,
      referenceId: job._id,
      onModel: 'Job',
    });

    // Emit notification to the job poster in real-time
    req.io.to(job.user.toString()).emit('receiveNotification', {
      type: 'job-application',
      message: `${user.name} applied for your ${job.title} position`,
      sender: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: job.applications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update application status
// @route   PUT /api/jobs/:id/applications/:applicationId
// @access  Private
exports.updateApplicationStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Make sure user is job owner or admin
    if (job.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Find the application
    const application = job.applications.find(
      (app) => app._id.toString() === req.params.applicationId
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Update status
    application.status = req.body.status || application.status;
    await job.save();

    // Create notification for applicant
    await Notification.create({
      recipient: application.user,
      sender: req.user.id,
      type: 'job-application-update',
      content: `Your application for ${job.title} has been ${application.status}`,
      referenceId: job._id,
      onModel: 'Job',
    });

    // Emit notification to the applicant in real-time
    req.io.to(application.user.toString()).emit('receiveNotification', {
      type: 'job-application-update',
      message: `Your application for ${job.title} has been ${application.status}`,
      sender: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: job.applications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get jobs by user
// @route   GET /api/jobs/user/:userId
// @access  Public
exports.getJobsByUser = async (req, res) => {
  try {
    const jobs = await Job.find({ user: req.params.userId }).populate(
      'user',
      'name profileImage'
    );

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's job applications
// @route   GET /api/jobs/applications/me
// @access  Private
exports.getMyApplications = async (req, res) => {
  try {
    const jobs = await Job.find({
      'applications.user': req.user.id,
    });

    // Extract applications for the current user
    const applications = [];
    jobs.forEach((job) => {
      const application = job.applications.find(
        (app) => app.user.toString() === req.user.id
      );
      if (application) {
        applications.push({
          job: {
            _id: job._id,
            title: job.title,
            company: job.company,
            location: job.location,
            employmentType: job.employmentType,
          },
          status: application.status,
          appliedAt: application.appliedAt,
        });
      }
    });

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search jobs
// @route   GET /api/jobs/search
// @access  Public
exports.searchJobs = async (req, res) => {
  try {
    const { q, location, type, experience, remote } = req.query;
    
    // Build query object
    const queryObj = {};
    
    if (q) {
      queryObj.$or = [
        { title: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { requirements: { $in: [new RegExp(q, 'i')] } },
      ];
    }
    
    if (location) {
      queryObj.location = { $regex: location, $options: 'i' };
    }
    
    if (type) {
      queryObj.employmentType = type;
    }
    
    if (experience) {
      queryObj.experienceLevel = experience;
    }
    
    if (remote) {
      queryObj.isRemote = remote === 'true';
    }
    
    const jobs = await Job.find(queryObj).populate('user', 'name profileImage');
    
    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
