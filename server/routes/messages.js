const express = require('express');
const { check } = require('express-validator');
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/messages/conversations
// @desc    Get all conversations for the current user
// @access  Private
router.get('/conversations', auth, messageController.getConversations);

// @route   GET /api/messages/conversations/:conversationId
// @desc    Get messages in a conversation
// @access  Private
router.get('/conversations/:conversationId', auth, messageController.getMessages);

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('recipientId', 'Recipient ID is required').not().isEmpty(),
      check('content', 'Message content is required').not().isEmpty(),
    ],
  ],
  messageController.sendMessage
);

// @route   POST /api/messages/group
// @desc    Create a group conversation
// @access  Private
router.post(
  '/group',
  [
    auth,
    [
      check('name', 'Group name is required').not().isEmpty(),
      check('participants', 'At least 2 participants are required').isArray({ min: 2 }),
    ],
  ],
  messageController.createGroupConversation
);

// @route   PUT /api/messages/group/:conversationId
// @desc    Update group info
// @access  Private
router.put(
  '/group/:conversationId',
  [auth, [check('name', 'Group name is required').not().isEmpty()]],
  messageController.updateGroupInfo
);

// @route   POST /api/messages/group/:conversationId/participants
// @desc    Add participants to group
// @access  Private
router.post(
  '/group/:conversationId/participants',
  [
    auth,
    [check('participants', 'At least one participant is required').isArray({ min: 1 })],
  ],
  messageController.addParticipants
);

// @route   DELETE /api/messages/group/:conversationId/participants/:participantId
// @desc    Remove participant from group
// @access  Private
router.delete(
  '/group/:conversationId/participants/:participantId',
  auth,
  messageController.removeParticipant
);

// @route   DELETE /api/messages/group/:conversationId/leave
// @desc    Leave group
// @access  Private
router.delete('/group/:conversationId/leave', auth, messageController.leaveGroup);

module.exports = router;
