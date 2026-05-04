const express = require('express');
const { generateTicketFromAI, handleAiConversation } = require('../services/openaiService');
const { protect } = require('../middleware/authMiddleware');
const { calculateDeadline, getSlaStatus } = require('../services/slaService');

const router = express.Router();

router.post('/ai-create-ticket', protect, async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ message: 'AI prompt is required' });
    }

    const parsed = await generateTicketFromAI(prompt);
    const deadline = calculateDeadline(parsed.priority);
    const slaStatus = getSlaStatus(deadline);

    res.json({
      ...parsed,
      deadline,
      status: 'Open',
      slaStatus,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/ai-conversation', protect, async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'AI message is required' });
    }

    const result = await handleAiConversation({ message, history });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
