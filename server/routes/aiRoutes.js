const express = require('express');
const { createTicket, handleConversation } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

const router = express.Router();

// Define input validation schemas for AI routes
const aiCreateSchema = {
  prompt: { required: true, minLength: 5, maxLength: 1000 },
};

const aiConversationSchema = {
  message: { required: true, minLength: 1, maxLength: 1000 },
};

// Rate-limiting for OpenAI endpoints to prevent API cost spikes (10 requests per minute)
const aiRateLimit = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many AI requests. Please try again in a minute.',
});

// Route health check
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'AI routes working' });
});

// Standard REST endpoints mounted under /api/ai
router.post('/create-ticket', protect, aiRateLimit, validate(aiCreateSchema), createTicket);
router.post('/conversation', protect, aiRateLimit, validate(aiConversationSchema), handleConversation);

// Backward Compatibility Aliases
router.post('/ai-create-ticket', protect, aiRateLimit, validate(aiCreateSchema), createTicket);
router.post('/ai-conversation', protect, aiRateLimit, validate(aiConversationSchema), handleConversation);

module.exports = router;
