const { generateTicketFromAI, handleAiConversation } = require('../services/openaiService');
const { calculateDeadline, getSlaStatus } = require('../services/slaService');

/**
 * @desc    Generate a structured ticket draft from a user's prompt using OpenAI GPT
 * @route   POST /api/ai/create-ticket
 * @access  Private
 */
const createTicket = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required.' });
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
    console.error('Error in createTicket controller:', error);
    next(error);
  }
};

/**
 * @desc    Handle follow-up questions or draft updates inside the AI co-pilot chat
 * @route   POST /api/ai/conversation
 * @access  Private
 */
const handleConversation = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const result = await handleAiConversation({ message, history });
    res.json(result);
  } catch (error) {
    console.error('Error in handleConversation controller:', error);
    next(error);
  }
};

module.exports = {
  createTicket,
  handleConversation,
};
