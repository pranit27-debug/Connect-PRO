const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get all conversations for the current user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get messages in a conversation
// @route   GET /api/messages/conversations/:conversationId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Check if user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Get messages with pagination
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name profileImage');

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        'readBy.user': { $ne: req.user.id },
        sender: { $ne: req.user.id },
      },
      { $push: { readBy: { user: req.user.id } } }
    );

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages.reverse(), // Return in chronological order
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content, attachments = [] } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Find or create conversation
    let conversation = await Conversation.findOrCreateConversation(
      req.user.id,
      recipientId
    );

    // Create message
    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user.id,
      content,
      attachments,
      readBy: [{ user: req.user.id }],
    });

    // Update conversation's last message
    conversation.lastMessage = message._id;
    await conversation.save();

    // Populate sender data
    const populatedMessage = await Message.findById(message._id).populate(
      'sender',
      'name profileImage'
    );

    // Create notification for recipient if they're not in the conversation
    if (!conversation.participants.includes(recipientId)) {
      const sender = await User.findById(req.user.id).select('name');
      
      await Notification.create({
        recipient: recipientId,
        sender: req.user.id,
        type: 'message',
        content: `New message from ${sender.name}`,
        referenceId: conversation._id,
        onModel: 'Conversation',
      });

      // Emit notification to the recipient in real-time
      req.io.to(recipientId).emit('receiveNotification', {
        type: 'message',
        message: `New message from ${sender.name}`,
        sender: req.user.id,
      });
    }

    // Emit the message to the conversation room
    req.io.to(conversation._id.toString()).emit('receiveMessage', populatedMessage);

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a group conversation
// @route   POST /api/messages/group
// @access  Private
exports.createGroupConversation = async (req, res) => {
  try {
    const { name, participants, image } = req.body;

    if (!name || !participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({
        message: 'Please provide a group name and at least 2 participants',
      });
    }

    // Add current user to participants if not already included
    if (!participants.includes(req.user.id)) {
      participants.unshift(req.user.id);
    }

    // Check if all participants exist
    const users = await User.find({ _id: { $in: participants } });
    if (users.length !== participants.length) {
      return res.status(404).json({ message: 'One or more participants not found' });
    }

    // Create group conversation
    const conversation = await Conversation.create({
      participants,
      isGroup: true,
      groupName: name,
      groupImage: image,
      groupAdmin: req.user.id,
    });

    // Notify all participants
    const adminUser = await User.findById(req.user.id).select('name');
    const notificationPromises = participants
      .filter((id) => id.toString() !== req.user.id)
      .map((participantId) =>
        Notification.create({
          recipient: participantId,
          sender: req.user.id,
          type: 'group-invite',
          content: `${adminUser.name} added you to the group "${name}"`,
          referenceId: conversation._id,
          onModel: 'Conversation',
        })
      );

    await Promise.all(notificationPromises);

    // Emit notifications to all participants in real-time
    participants.forEach((participantId) => {
      if (participantId.toString() !== req.user.id) {
        req.io.to(participantId.toString()).emit('receiveNotification', {
          type: 'group-invite',
          message: `${adminUser.name} added you to the group "${name}"`,
          sender: req.user.id,
        });
      }
    });

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name profileImage')
      .populate('groupAdmin', 'name profileImage');

    res.status(201).json({
      success: true,
      data: populatedConversation,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update group info
// @route   PUT /api/messages/group/:conversationId
// @access  Private
exports.updateGroupInfo = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { name, image } = req.body;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is group admin
    if (conversation.groupAdmin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only group admin can update group info' });
    }

    // Update group info
    if (name) conversation.groupName = name;
    if (image) conversation.groupImage = image;

    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name profileImage')
      .populate('groupAdmin', 'name profileImage');

    // Notify all participants
    const notificationPromises = conversation.participants
      .filter((id) => id.toString() !== req.user.id)
      .map((participantId) =>
        Notification.create({
          recipient: participantId,
          sender: req.user.id,
          type: 'group-update',
          content: `Group info has been updated`,
          referenceId: conversation._id,
          onModel: 'Conversation',
        })
      );

    await Promise.all(notificationPromises);

    // Emit group update to all participants
    req.io.to(conversation._id.toString()).emit('groupUpdated', populatedConversation);

    res.status(200).json({
      success: true,
      data: populatedConversation,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add participants to group
// @route   POST /api/messages/group/:conversationId/participants
// @access  Private
exports.addParticipants = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { participants } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one participant' });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is group admin
    if (conversation.groupAdmin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only group admin can add participants' });
    }

    // Check if new participants exist
    const newParticipants = await User.find({ _id: { $in: participants } });
    if (newParticipants.length !== participants.length) {
      return res.status(404).json({ message: 'One or more participants not found' });
    }

    // Add new participants (avoid duplicates)
    const existingParticipantIds = conversation.participants.map((p) => p.toString());
    const uniqueNewParticipants = participants.filter(
      (id) => !existingParticipantIds.includes(id.toString())
    );

    if (uniqueNewParticipants.length === 0) {
      return res.status(400).json({ message: 'All users are already in the group' });
    }

    conversation.participants.push(...uniqueNewParticipants);
    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name profileImage')
      .populate('groupAdmin', 'name profileImage');

    // Notify new participants
    const adminUser = await User.findById(req.user.id).select('name');
    const notificationPromises = uniqueNewParticipants.map((participantId) =>
      Notification.create({
        recipient: participantId,
        sender: req.user.id,
        type: 'group-invite',
        content: `${adminUser.name} added you to the group "${conversation.groupName}"`,
        referenceId: conversation._id,
        onModel: 'Conversation',
      })
    );

    await Promise.all(notificationPromises);

    // Emit notifications to new participants
    uniqueNewParticipants.forEach((participantId) => {
      req.io.to(participantId.toString()).emit('receiveNotification', {
        type: 'group-invite',
        message: `${adminUser.name} added you to the group "${conversation.groupName}"`,
        sender: req.user.id,
      });
    });

    // Emit group update to all participants
    req.io.to(conversation._id.toString()).emit('groupUpdated', populatedConversation);

    res.status(200).json({
      success: true,
      data: populatedConversation,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove participant from group
// @route   DELETE /api/messages/group/:conversationId/participants/:participantId
// @access  Private
exports.removeParticipant = async (req, res) => {
  try {
    const { conversationId, participantId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is group admin or the participant themselves
    if (
      conversation.groupAdmin.toString() !== req.user.id &&
      participantId !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Only group admin or the participant themselves can remove participants',
      });
    }

    // Check if participant is in the group
    const participantIndex = conversation.participants.findIndex(
      (p) => p._id.toString() === participantId
    );

    if (participantIndex === -1) {
      return res.status(404).json({ message: 'Participant not found in group' });
    }

    // Remove participant
    const removedParticipant = conversation.participants.splice(participantIndex, 1)[0];

    // If no participants left, delete the conversation
    if (conversation.participants.length === 0) {
      await conversation.remove();
      return res.status(200).json({
        success: true,
        data: {},
      });
    }

    // If group admin is removed, assign new admin (first participant)
    if (conversation.groupAdmin.toString() === participantId) {
      conversation.groupAdmin = conversation.participants[0];
      
      // Notify new admin
      await Notification.create({
        recipient: conversation.groupAdmin,
        sender: req.user.id,
        type: 'group-admin',
        content: `You are now the admin of the group "${conversation.groupName}"`,
        referenceId: conversation._id,
        onModel: 'Conversation',
      });

      // Emit notification to new admin
      req.io.to(conversation.groupAdmin.toString()).emit('receiveNotification', {
        type: 'group-admin',
        message: `You are now the admin of the group "${conversation.groupName}"`,
        sender: req.user.id,
      });
    }

    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name profileImage')
      .populate('groupAdmin', 'name profileImage');

    // Notify removed participant
    await Notification.create({
      recipient: participantId,
      sender: req.user.id,
      type: 'group-remove',
      content: `You have been removed from the group "${conversation.groupName}"`,
      referenceId: conversation._id,
      onModel: 'Conversation',
    });

    // Emit notification to removed participant
    req.io.to(participantId).emit('receiveNotification', {
      type: 'group-remove',
      message: `You have been removed from the group "${conversation.groupName}"`,
      sender: req.user.id,
    });

    // Emit group update to all remaining participants
    req.io.to(conversation._id.toString()).emit('groupUpdated', populatedConversation);

    // Remove participant from the conversation room
    req.io.sockets.sockets.forEach((socket) => {
      if (socket.userId === participantId) {
        socket.leave(conversation._id.toString());
      }
    });

    res.status(200).json({
      success: true,
      data: populatedConversation,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Leave group
// @route   DELETE /api/messages/group/:conversationId/leave
// @access  Private
exports.leaveGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is in the group
    const participantIndex = conversation.participants.findIndex(
      (p) => p._id.toString() === userId
    );

    if (participantIndex === -1) {
      return res.status(400).json({ message: 'You are not in this group' });
    }

    // Remove user from participants
    conversation.participants.splice(participantIndex, 1);

    // If no participants left, delete the conversation
    if (conversation.participants.length === 0) {
      await conversation.remove();
      return res.status(200).json({
        success: true,
        data: {},
      });
    }

    // If group admin leaves, assign new admin (first participant)
    if (conversation.groupAdmin.toString() === userId) {
      conversation.groupAdmin = conversation.participants[0];
      
      // Notify new admin
      await Notification.create({
        recipient: conversation.groupAdmin,
        sender: userId,
        type: 'group-admin',
        content: `You are now the admin of the group "${conversation.groupName}"`,
        referenceId: conversation._id,
        onModel: 'Conversation',
      });

      // Emit notification to new admin
      req.io.to(conversation.groupAdmin.toString()).emit('receiveNotification', {
        type: 'group-admin',
        message: `You are now the admin of the group "${conversation.groupName}"`,
        sender: userId,
      });
    }

    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name profileImage')
      .populate('groupAdmin', 'name profileImage');

    // Notify remaining participants
    const notificationPromises = conversation.participants.map((participantId) =>
      Notification.create({
        recipient: participantId,
        sender: userId,
        type: 'group-leave',
        content: `${req.user.name} has left the group "${conversation.groupName}"`,
        referenceId: conversation._id,
        onModel: 'Conversation',
      })
    );

    await Promise.all(notificationPromises);

    // Emit notifications to remaining participants
    conversation.participants.forEach((participantId) => {
      req.io.to(participantId.toString()).emit('receiveNotification', {
        type: 'group-leave',
        message: `${req.user.name} has left the group "${conversation.groupName}"`,
        sender: userId,
      });
    });

    // Emit group update to all remaining participants
    req.io.to(conversation._id.toString()).emit('groupUpdated', populatedConversation);

    // Remove user from the conversation room
    req.io.sockets.sockets.forEach((socket) => {
      if (socket.userId === userId) {
        socket.leave(conversation._id.toString());
      }
    });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
