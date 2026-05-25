const express = require('express');
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  assignTicket,
} = require('../controllers/ticketController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

// Define input validation schemas for tickets
const ticketCreateSchema = {
  title: { required: true, minLength: 3, maxLength: 100 },
  description: { required: true, minLength: 10 },
  department: { required: true, enum: ['IT', 'Facilities', 'Admin'] },
  priority: { required: false, enum: ['Low', 'Medium', 'High'] },
};

const ticketUpdateSchema = {
  title: { required: false, minLength: 3, maxLength: 100 },
  description: { required: false, minLength: 10 },
  department: { required: false, enum: ['IT', 'Facilities', 'Admin'] },
  priority: { required: false, enum: ['Low', 'Medium', 'High'] },
  status: { required: false, enum: ['Open', 'In Progress', 'Resolved', 'Escalated', 'Closed'] },
};

router.use(protect);

router.route('/')
  .get(getTickets)
  .post(validate(ticketCreateSchema), createTicket);

router.route('/:id')
  .get(getTicketById)
  .put(validate(ticketUpdateSchema), updateTicket)
  .patch(validate(ticketUpdateSchema), updateTicket)
  .delete(authorizeRoles('admin'), deleteTicket);

router.route('/:id/assign')
  .put(assignTicket);

module.exports = router;

