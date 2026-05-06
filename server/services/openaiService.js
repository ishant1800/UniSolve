const OpenAI = require('openai');

const openAiKey = process.env.OPENAI_API_KEY;

if (!openAiKey) {
  throw new Error('OPENAI_API_KEY is required to use AI ticket creation');
}

const client = new OpenAI({ apiKey: openAiKey });

/* =========================
   SYSTEM PROMPT
========================= */
const systemPrompt = `
You are an intelligent helpdesk assistant for a campus system called UniSolve.

Your task is to convert a user's natural language issue into a STRICT JSON object.

IMPORTANT RULES:
- Output ONLY valid JSON
- No markdown or extra text
- Always return all fields

JSON FORMAT:
{
  "title": "short clear summary (max 8 words)",
  "description": "detailed explanation of the issue",
  "department": "IT | Facilities | Admin",
  "priority": "Low | Medium | High"
}
`;

/* =========================
   CONSTANTS
========================= */
const VALID_DEPARTMENTS = ['IT', 'Facilities', 'Admin'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];

/* =========================
   HELPERS
========================= */
const normalizeField = (value, validValues, defaultValue) => {
  const text = String(value || '').trim();
  const found = validValues.find(
    (item) => item.toLowerCase() === text.toLowerCase()
  );
  return found || defaultValue;
};

const normalizeTicket = (data) => {
  return {
    title: data.title || 'General Issue',
    description: data.description || 'No description provided',
    department: normalizeField(data.department, VALID_DEPARTMENTS, 'IT'),
    priority: normalizeField(data.priority, VALID_PRIORITIES, 'Medium'),
  };
};

const fallbackTicket = (message) => ({
  title: 'General Issue',
  description: message || 'User reported an issue',
  department: 'IT',
  priority: 'Medium',
  fallback: true,
});

/* =========================
   JSON PARSER
========================= */
const parseJsonContent = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }
};

/* =========================
   OPENAI CALL (FIXED)
========================= */
const createOpenAIResponse = async (messages) => {
  return Promise.race([
    client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OpenAI timeout')), 8000)
    ),
  ]);
};

const extractResponseText = (response) => {
  const content = response?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Missing AI response');
  return content;
};

/* =========================
   MAIN FUNCTION
========================= */
const generateTicketFromAI = async (message) => {
  try {
    const response = await createOpenAIResponse([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]);

    const text = extractResponseText(response);
    const parsed = parseJsonContent(text);
    const normalized = normalizeTicket(parsed);

    return { ...normalized, fallback: false };
  } catch (error) {
    console.error('AI ERROR:', error.message);
    return fallbackTicket(message);
  }
};

/* =========================
   CONVERSATION SUPPORT
========================= */
const buildChatPrompt = (message, history = []) => {
  const historyText = history
    .map((h) => `${h.role}: ${h.content}`)
    .join('\n');

  return `${systemPrompt}

Conversation:
${historyText}

User: ${message}

Return either:

1. Ticket JSON:
{
  "type": "ticket",
  "data": {
    "title": "...",
    "description": "...",
    "department": "...",
    "priority": "...",
    "fallback": false
  }
}

OR

2. Question:
{
  "type": "question",
  "message": "clarifying question"
}
`;
};

const handleAiConversation = async ({ message, history = [] }) => {
  try {
    const response = await createOpenAIResponse([
      { role: 'user', content: buildChatPrompt(message, history) },
    ]);

    const text = extractResponseText(response);
    const parsed = parseJsonContent(text);

    if (parsed.type === 'ticket') {
      const normalized = normalizeTicket(parsed.data);
      return {
        type: 'ticket',
        data: { ...normalized, fallback: false },
      };
    }

    if (parsed.type === 'question') {
      return parsed;
    }

    const fallback = await generateTicketFromAI(message);

    return {
      type: 'ticket',
      data: { ...fallback, fallback: true },
    };
  } catch (error) {
    console.error('AI CONVO ERROR:', error.message);

    const fallback = fallbackTicket(message);

    return {
      type: 'ticket',
      data: fallback,
    };
  }
};

/* =========================
   EXPORTS
========================= */
module.exports = {
  generateTicketFromAI,
  handleAiConversation,
};