const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    user.password = undefined;
    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    // Make sure user is the owner or admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Not authorized to update this user',
      });
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
exports.deleteUser = async (req, res) => {
  try {
    // Make sure user is the owner or admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Not authorized to delete this user',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // TODO: Delete user's posts, comments, etc.
    
    await user.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's connections
// @route   GET /api/users/:id/connections
// @access  Private
exports.getUserConnections = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('connections')
      .populate('connections.user', 'name profileImage headline');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter only accepted connections
    const acceptedConnections = user.connections.filter(
      (connection) => connection.status === 'accepted'
    );

    res.status(200).json({
      success: true,
      count: acceptedConnections.length,
      data: acceptedConnections,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send connection request
// @route   POST /api/users/:id/connect
// @access  Private
exports.sendConnectionRequest = async (req, res) => {
  try {
    // Check if user is trying to connect with themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'Cannot connect with yourself' });
    }

    const user = await User.findById(req.user.id);
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if connection already exists
    const existingConnection = user.connections.find(
      (connection) => connection.user.toString() === req.params.id
    );

    if (existingConnection) {
      return res.status(400).json({ message: 'Connection already exists' });
    }

    // Add connection to both users
    user.connections.unshift({
      user: targetUser._id,
      status: 'pending',
    });

    targetUser.connections.unshift({
      user: user._id,
      status: 'pending',
    });

    await user.save();
    await targetUser.save();

    // Create notification
    await Notification.create({
      recipient: targetUser._id,
      sender: user._id,
      type: 'connection-request',
      content: `${user.name} sent you a connection request`,
      referenceId: user._id,
      onModel: 'User',
    });

    // Emit notification to the target user in real-time
    req.io.to(targetUser._id.toString()).emit('receiveNotification', {
      type: 'connection-request',
      message: `${user.name} sent you a connection request`,
      sender: user._id,
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

// @desc    Accept connection request
// @route   PUT /api/users/:id/accept-connection
// @access  Private
exports.acceptConnection = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find and update the connection status
    const userConnection = user.connections.find(
      (connection) => connection.user.toString() === req.params.id
    );

    const targetUserConnection = targetUser.connections.find(
      (connection) => connection.user.toString() === req.user.id
    );

    if (!userConnection || !targetUserConnection) {
      return res.status(400).json({ message: 'No connection request found' });
    }

    userConnection.status = 'accepted';
    targetUserConnection.status = 'accepted';

    await user.save();
    await targetUser.save();

    // Create notification
    await Notification.create({
      recipient: targetUser._id,
      sender: user._id,
      type: 'connection-accepted',
      content: `${user.name} accepted your connection request`,
      referenceId: user._id,
      onModel: 'User',
    });

    // Emit notification to the target user in real-time
    req.io.to(targetUser._id.toString()).emit('receiveNotification', {
      type: 'connection-accepted',
      message: `${user.name} accepted your connection request`,
      sender: user._id,
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

// @desc    Remove connection
// @route   DELETE /api/users/:id/connection
// @access  Private
exports.removeConnection = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove connection from both users
    user.connections = user.connections.filter(
      (connection) => connection.user.toString() !== req.params.id
    );

    targetUser.connections = targetUser.connections.filter(
      (connection) => connection.user.toString() !== req.user.id
    );

    await user.save();
    await targetUser.save();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's pending connection requests
// @route   GET /api/users/me/connection-requests
// @access  Private
exports.getConnectionRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('connections')
      .populate({
        path: 'connections.user',
        select: 'name profileImage headline',
        match: { 'connections.status': 'pending' },
      });

    // Filter only pending connections
    const pendingConnections = user.connections.filter(
      (connection) => connection.status === 'pending'
    );

    res.status(200).json({
      success: true,
      count: pendingConnections.length,
      data: pendingConnections,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search users
// @route   GET /api/users/search?q=query
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.status(400).json({ message: 'Please provide a search query' });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { headline: { $regex: query, $options: 'i' } },
        { skills: { $in: [new RegExp(query, 'i')] } },
      ],
      _id: { $ne: req.user.id }, // Exclude the current user
    }).select('name profileImage headline');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
