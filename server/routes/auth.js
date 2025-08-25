const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 }),
  ],
  authController.register
);

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  authController.login
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, authController.getMe);

// @route   POST /api/auth/forgotpassword
// @desc    Forgot password
// @access  Public
router.post(
  '/forgotpassword',
  [check('email', 'Please include a valid email').isEmail()],
  authController.forgotPassword
);

// @route   PUT /api/auth/resetpassword/:resettoken
// @desc    Reset password
// @access  Public
router.put(
  '/resetpassword/:resettoken',
  [
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 }),
  ],
  authController.resetPassword
);

// @route   PUT /api/auth/updatedetails
// @desc    Update user details
// @access  Private
router.put(
  '/updatedetails',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
    ],
  ],
  authController.updateDetails
);

// @route   PUT /api/auth/updatepassword
// @desc    Update password
// @access  Private
router.put(
  '/updatepassword',
  [
    auth,
    [
      check('currentPassword', 'Please enter current password').exists(),
      check(
        'newPassword',
        'Please enter a password with 6 or more characters'
      ).isLength({ min: 6 }),
    ],
  ],
  authController.updatePassword
);

module.exports = router;
