const express = require('express');
const { check } = require('express-validator');
const jobController = require('../controllers/jobController');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/jobs
// @desc    Get all jobs
// @access  Public
router.get('/', jobController.getJobs);

// @route   GET /api/jobs/search
// @desc    Search jobs
// @access  Public
router.get('/search', jobController.searchJobs);

// @route   GET /api/jobs/:id
// @desc    Get job by ID
// @access  Public
router.get('/:id', jobController.getJob);

// @route   POST /api/jobs
// @desc    Create a job
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('company', 'Company is required').not().isEmpty(),
      check('location', 'Location is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('requirements', 'Requirements are required').isArray({ min: 1 }),
      check('responsibilities', 'Responsibilities are required').isArray({ min: 1 }),
    ],
  ],
  jobController.createJob
);

// @route   PUT /api/jobs/:id
// @desc    Update a job
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('company', 'Company is required').not().isEmpty(),
      check('location', 'Location is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
    ],
  ],
  jobController.updateJob
);

// @route   DELETE /api/jobs/:id
// @desc    Delete a job
// @access  Private
router.delete('/:id', auth, jobController.deleteJob);

// @route   POST /api/jobs/:id/apply
// @desc    Apply for a job
// @access  Private
router.post(
  '/:id/apply',
  [
    auth,
    [
      check('resume', 'Resume is required').not().isEmpty(),
      check('coverLetter', 'Cover letter is required').not().isEmpty(),
    ],
  ],
  jobController.applyForJob
);

// @route   PUT /api/jobs/:id/applications/:applicationId
// @desc    Update application status
// @access  Private
router.put(
  '/:id/applications/:applicationId',
  [auth, [check('status', 'Status is required').not().isEmpty()]],
  jobController.updateApplicationStatus
);

// @route   GET /api/jobs/user/:userId
// @desc    Get jobs by user ID
// @access  Public
router.get('/user/:userId', jobController.getJobsByUser);

// @route   GET /api/jobs/applications/me
// @desc    Get user's job applications
// @access  Private
router.get('/applications/me', auth, jobController.getMyApplications);

module.exports = router;
