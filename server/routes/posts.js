const express = require('express');
const { check } = require('express-validator');
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/posts
// @desc    Get all posts
// @access  Private
router.get('/', auth, postController.getPosts);

// @route   GET /api/posts/feed/me
// @desc    Get posts from connections (feed)
// @access  Private
router.get('/feed/me', auth, postController.getFeedPosts);

// @route   GET /api/posts/:id
// @desc    Get post by ID
// @access  Private
router.get('/:id', auth, postController.getPost);

// @route   POST /api/posts
// @desc    Create a post
// @access  Private
router.post(
  '/',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  postController.createPost
);

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', auth, postController.deletePost);

// @route   PUT /api/posts/like/:id
// @desc    Like a post
// @access  Private
router.put('/like/:id', auth, postController.likePost);

// @route   PUT /api/posts/unlike/:id
// @desc    Unlike a post
// @access  Private
router.put('/unlike/:id', auth, postController.unlikePost);

// @route   POST /api/posts/comment/:id
// @desc    Comment on a post
// @access  Private
router.post(
  '/comment/:id',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  postController.addComment
);

// @route   DELETE /api/posts/comment/:id/:comment_id
// @desc    Delete a comment
// @access  Private
router.delete('/comment/:id/:comment_id', auth, postController.deleteComment);

// @route   POST /api/posts/share/:id
// @desc    Share a post
// @access  Private
router.post('/share/:id', auth, postController.sharePost);

// @route   GET /api/posts/user/:userId
// @desc    Get posts by user ID
// @access  Private
router.get('/user/:userId', auth, postController.getPostsByUser);

module.exports = router;
