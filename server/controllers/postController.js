const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name profileImage')
      .populate('comments.user', 'name profileImage');

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name profileImage')
      .populate('comments.user', 'name profileImage');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    const newPost = new Post({
      text: req.body.text,
      user: req.user.id,
      image: req.body.image,
    });

    const post = await newPost.save();
    
    // Populate user data before sending response
    const populatedPost = await Post.findById(post._id)
      .populate('user', 'name profileImage');

    res.status(201).json({
      success: true,
      data: populatedPost,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check user
    if (post.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await post.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Like a post
// @route   PUT /api/posts/like/:id
// @access  Private
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if the post has already been liked
    if (
      post.likes.some((like) => like.user.toString() === req.user.id)
    ) {
      return res.status(400).json({ message: 'Post already liked' });
    }

    post.likes.unshift({ user: req.user.id });

    await post.save();

    // Create notification if the post owner is not the one who liked it
    if (post.user.toString() !== req.user.id) {
      const user = await User.findById(req.user.id);
      
      await Notification.create({
        recipient: post.user,
        sender: req.user.id,
        type: 'post-like',
        content: `${user.name} liked your post`,
        referenceId: post._id,
        onModel: 'Post',
      });

      // Emit notification to the post owner in real-time
      req.io.to(post.user.toString()).emit('receiveNotification', {
        type: 'post-like',
        message: `${user.name} liked your post`,
        sender: req.user.id,
      });
    }

    res.status(200).json({
      success: true,
      data: post.likes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Unlike a post
// @route   PUT /api/posts/unlike/:id
// @access  Private
exports.unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if the post has been liked
    if (
      !post.likes.some((like) => like.user.toString() === req.user.id)
    ) {
      return res.status(400).json({ message: 'Post has not yet been liked' });
    }

    // Remove the like
    post.likes = post.likes.filter(
      ({ user }) => user.toString() !== req.user.id
    );

    await post.save();

    res.status(200).json({
      success: true,
      data: post.likes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Comment on a post
// @route   POST /api/posts/comment/:id
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = {
      text: req.body.text,
      user: req.user.id,
      name: user.name,
      avatar: user.profileImage,
    };

    post.comments.unshift(newComment);

    await post.save();

    // Create notification if the post owner is not the one who commented
    if (post.user.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.user,
        sender: req.user.id,
        type: 'post-comment',
        content: `${user.name} commented on your post: ${req.body.text.substring(0, 50)}...`,
        referenceId: post._id,
        onModel: 'Post',
      });

      // Emit notification to the post owner in real-time
      req.io.to(post.user.toString()).emit('receiveNotification', {
        type: 'post-comment',
        message: `${user.name} commented on your post`,
        sender: req.user.id,
      });
    }

    res.status(200).json({
      success: true,
      data: post.comments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/posts/comment/:id/:comment_id
// @access  Private
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Pull out comment
    const comment = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );

    // Make sure comment exists
    if (!comment) {
      return res.status(404).json({ message: 'Comment does not exist' });
    }

    // Check user is the comment owner or post owner or admin
    if (
      comment.user.toString() !== req.user.id &&
      post.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Get remove index
    const removeIndex = post.comments
      .map((comment) => comment.id)
      .indexOf(req.params.comment_id);

    post.comments.splice(removeIndex, 1);

    await post.save();

    res.status(200).json({
      success: true,
      data: post.comments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Share a post
// @route   POST /api/posts/share/:id
// @access  Private
exports.sharePost = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const originalPost = await Post.findById(req.params.id);

    if (!originalPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create a new post with shared content
    const newPost = new Post({
      text: req.body.text || `Shared: ${originalPost.text.substring(0, 100)}...`,
      user: req.user.id,
      sharedPost: originalPost._id,
    });

    const post = await newPost.save();
    
    // Add to original post's shares
    originalPost.shares.unshift({ user: req.user.id });
    await originalPost.save();

    // Populate user data before sending response
    const populatedPost = await Post.findById(post._id)
      .populate('user', 'name profileImage')
      .populate('sharedPost');

    // Create notification for the original post owner
    if (originalPost.user.toString() !== req.user.id) {
      await Notification.create({
        recipient: originalPost.user,
        sender: req.user.id,
        type: 'post-share',
        content: `${user.name} shared your post`,
        referenceId: originalPost._id,
        onModel: 'Post',
      });

      // Emit notification to the original post owner in real-time
      req.io.to(originalPost.user.toString()).emit('receiveNotification', {
        type: 'post-share',
        message: `${user.name} shared your post`,
        sender: req.user.id,
      });
    }

    res.status(201).json({
      success: true,
      data: populatedPost,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get posts by user ID
// @route   GET /api/posts/user/:userId
// @access  Private
exports.getPostsByUser = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('user', 'name profileImage')
      .populate('comments.user', 'name profileImage');

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get posts from connections (feed)
// @route   GET /api/posts/feed/me
// @access  Private
exports.getFeedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get IDs of user's connections
    const connectionIds = user.connections
      .filter(conn => conn.status === 'accepted')
      .map(conn => conn.user);
    
    // Add current user's ID to see their own posts in the feed
    connectionIds.push(req.user.id);

    const posts = await Post.find({ user: { $in: connectionIds } })
      .sort({ createdAt: -1 })
      .populate('user', 'name profileImage')
      .populate('comments.user', 'name profileImage');

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
