const { OpenAI } = require('openai');

const openAiKey = process.env.OPENAI_API_KEY;

if (!openAiKey) {
  throw new Error('OPENAI_API_KEY is required to use AI ticket creation');
}

const client = new OpenAI({ apiKey: openAiKey });

const systemPrompt = `
You are an intelligent helpdesk assistant for a campus system called UniSolve.

Your task is to convert a user's natural language issue into a STRICT JSON object.

IMPORTANT RULES:
- Output ONLY valid JSON (no explanations, no extra text)
- Do NOT include markdown or code blocks
- Always return all fields
- If unsure, make a reasonable assumption

JSON FORMAT:
{
  "title": "short clear summary (max 8 words)",
  "description": "detailed explanation of the issue",
  "department": "IT | Facilities | Admin",
  "priority": "Low | Medium | High"
}

CLASSIFICATION RULES:

Department:
- IT → internet, wifi, login, software, systems, projector, computers
- Facilities → electricity, water, plumbing, AC, furniture, maintenance
- Admin → ID cards, fees, approvals, documents, office requests

Priority:
- High → completely broken, urgent, blocking work, safety issue
- Medium → partially working, causing inconvenience
- Low → minor issue, request, or general query

EXTRA RULES:
- Improve grammar and clarity
- Remove unnecessary words
- Infer missing details smartly
- Keep title concise and meaningful

EXAMPLES:

Input: "wifi not working in hostel since morning"
Output:
{
  "title": "WiFi not working",
  "description": "WiFi is not working in the hostel since morning",
  "department": "IT",
  "priority": "High"
}

Input: "fan in classroom making noise"
Output:
{
  "title": "Fan making noise",
  "description": "Ceiling fan in classroom is making unusual noise",
  "department": "Facilities",
  "priority": "Low"
}
`;

const VALID_DEPARTMENTS = ['IT', 'Facilities', 'Admin'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];

const normalizeField = (value, validValues, defaultValue) => {
  const text = String(value || '').trim();
  if (!text) {
    return defaultValue;
  }

  const found = validValues.find((item) => item.toLowerCase() === text.toLowerCase());
  return found || defaultValue;
};

const normalizeTicket = (data) => {
  const titleValue = String(data?.title || '').trim();
  const descriptionValue = String(data?.description || '').trim();
  const departmentValue = normalizeField(data?.department, VALID_DEPARTMENTS, 'IT');
  const priorityValue = normalizeField(data?.priority, VALID_PRIORITIES, 'Medium');

  const title = titleValue
    ? titleValue.length > 80
      ? `${titleValue.slice(0, 77).trim()}...`
      : titleValue
    : 'General Issue';

  if (!descriptionValue) {
    throw new Error('Validation failed: description is required');
  }

  return {
    title,
    description: descriptionValue,
    department: departmentValue,
    priority: priorityValue,
  };
};

const fallbackTicket = (message) => ({
  title: 'General Issue',
  description: String(message || '').trim() || 'The user reported an issue.',
  department: 'IT',
  priority: 'Medium',
  fallback: true,
});

const parseJsonContent = (text) => {
  if (typeof text !== 'string') {
    return text;
  }

  const candidate = text.trim();
  if (!candidate) {
    throw new Error('Empty text returned from AI');
  }

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const match = candidate.match(/\{[\s\S]*\}$/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Unable to parse AI JSON response');
  }
};

const issuePattern = /(not working|broken|error|failed|unable|can(?:'|not)|down|problem|stuck|not connecting|doesn't work|does not work|slow|issue|crash|crashes|frozen|lock(ed)?|timeout|disconnect(ed)?|wifi|internet)/i;
const contextPattern = /(laptop|computer|desktop|printer|projector|phone|mobile|tablet|router|modem|server|portal|website|application|app|software|system|classroom|lab|library|office|hostel|building|room|floor|campus|dorm|kitchen|cafeteria|gym|hall|door|gate|parking|bus|shuttle|payment|fee|ID card|id card|card|student portal|login portal)/i;

const hasIssueDescription = (text) => {
  return issuePattern.test(String(text || ''));
};

const hasContextualDetail = (text) => {
  return contextPattern.test(String(text || ''));
};

const isSufficientInfo = (message, history = []) => {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const combined = [message, ...(Array.isArray(history) ? history.map((turn) => String(turn.content || '').trim()) : [])]
    .filter(Boolean)
    .join(' ');

  return hasIssueDescription(combined) && hasContextualDetail(combined);
};

const getFollowUpQuestion = (message) => {
  const normalized = String(message || '').trim();

  if (!hasIssueDescription(normalized)) {
    return 'What exactly is happening?';
  }

  if (!hasContextualDetail(normalized)) {
    return 'Where is this issue occurring, or which device is affected?';
  }

  return 'Can you share any additional location or device details so I can create the ticket?';
};

const extractResponseText = (response) => {
  const content = response?.output?.[0]?.content?.[0]?.text;
  if (content === undefined || content === null) {
    throw new Error('Missing response output text');
  }
  return content;
};

const buildOpenAIInput = (message) => [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: message },
];

const createOpenAIResponse = async (message) => {
  return client.responses.create({
    model: 'gpt-4o-mini',
    input: buildOpenAIInput(message),
    temperature: 0,
    text: {
      format: { type: 'json_object' },
    },
  });
};

const generateTicketFromAI = async (message) => {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('User message must be a non-empty string');
  }

  try {
    const response = await createOpenAIResponse(message);
    const rawText = extractResponseText(response);
    const parsed = parseJsonContent(rawText);
    const normalized = normalizeTicket(parsed);
    return { ...normalized, fallback: false };
  } catch (error) {
    console.error('AI Failure:', error.message, {
      timestamp: new Date().toISOString(),
      input: message,
      stack: error.stack,
    });
    return fallbackTicket(message);
  }
};

const formatConversationHistory = (history) => {
  if (!Array.isArray(history)) {
    return '';
  }

  return history
    .map((turn) => {
      if (!turn || typeof turn !== 'object') {
        return null;
      }
      const role = turn.role === 'assistant' ? 'Assistant' : 'User';
      const content = String(turn.content || '').trim();
      return content ? `${role}: ${content}` : null;
    })
    .filter(Boolean)
    .join('\n');
};

const buildChatPrompt = (message, history) => {
  const historyText = formatConversationHistory(history);
  return `${systemPrompt}

You are now maintaining a conversation with the user.
If the issue is unclear, ask a follow-up question instead of creating a ticket.
When enough detail is available, return a JSON object with:
{
  "type": "ticket",
  "data": {
    "title": "short clear summary (max 8 words)",
    "description": "detailed explanation of the issue",
    "department": "IT | Facilities | Admin",
    "priority": "Low | Medium | High",
    "confidence": "High | Medium | Low",
    "fallback": false
  }
}
If more detail is required to build a ticket, return:
{
  "type": "question",
  "message": "a single clarifying follow-up question"
}
Do not return both a question and a ticket.
Do not include any extra text or markdown.

${historyText ? `Conversation history:\n${historyText}\n` : ''}User: ${String(message).trim()}`;
};

const createChatResponse = async (message, history = []) => {
  const prompt = buildChatPrompt(message, history);
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [{ role: 'user', content: prompt }],
    temperature: 0,
    text: {
      format: { type: 'json_object' },
    },
  });

  const rawText = extractResponseText(response);
  return parseJsonContent(rawText);
};

const handleAiConversation = async ({ message, history = [] }) => {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('User message must be a non-empty string');
  }

  const conversationLength = Array.isArray(history) ? history.length : 0;
  const sufficient = isSufficientInfo(message, history);

  if (!sufficient && conversationLength < 3) {
    return {
      type: 'question',
      message: getFollowUpQuestion(message),
    };
  }

  try {
    const payload = await createChatResponse(message, history);

    if (payload?.type === 'ticket' && payload.data) {
      const ticket = payload.data;
      const validated = (() => {
        try {
          return normalizeTicket(ticket);
        } catch (err) {
          return null;
        }
      })();

      if (validated) {
        return {
          type: 'ticket',
          data: {
            ...validated,
            fallback: false,
          },
        };
      }
    }

    if (payload?.type === 'question' && payload.message && conversationLength < 3) {
      return {
        type: 'question',
        message: String(payload.message).trim(),
      };
    }

    const fallback = await generateTicketFromAI(message);
    return {
      type: 'ticket',
      data: {
        ...fallback,
        fallback: true,
      },
    };
  } catch (error) {
    console.error('AI Conversation Failure:', error.message, {
      timestamp: new Date().toISOString(),
      input: message,
      history,
      stack: error.stack,
    });

    const fallback = fallbackTicket(message);
    return {
      type: 'ticket',
      data: {
        ...fallback,
        fallback: true,
      },
    };
  }
};

module.exports = {
  generateTicketFromAI,
  handleAiConversation,
  normalizeTicket,
  fallbackTicket,
};
