const express = require('express');
const { check } = require('express-validator');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', auth, userController.getUsers);

// @route   GET /api/users/search
// @desc    Search users
// @access  Private
router.get('/search', auth, userController.searchUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, userController.getUser);

// @route   POST /api/users
// @desc    Create user
// @access  Private/Admin
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
      check(
        'password',
        'Please enter a password with 6 or more characters'
      ).isLength({ min: 6 }),
    ],
  ],
  userController.createUser
);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
    ],
  ],
  userController.updateUser
);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private
router.delete('/:id', auth, userController.deleteUser);

// Connections
// @route   GET /api/users/:id/connections
// @desc    Get user's connections
// @access  Private
router.get('/:id/connections', auth, userController.getUserConnections);

// @route   POST /api/users/:id/connect
// @desc    Send connection request
// @access  Private
router.post('/:id/connect', auth, userController.sendConnectionRequest);

// @route   PUT /api/users/:id/accept-connection
// @desc    Accept connection request
// @access  Private
router.put('/:id/accept-connection', auth, userController.acceptConnection);

// @route   DELETE /api/users/:id/connection
// @desc    Remove connection
// @access  Private
router.delete('/:id/connection', auth, userController.removeConnection);

// @route   GET /api/users/me/connection-requests
// @desc    Get user's pending connection requests
// @access  Private
router.get('/me/connection-requests', auth, userController.getConnectionRequests);

module.exports = router;
