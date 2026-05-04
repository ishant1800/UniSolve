const express = require('express');
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
} = require('../controllers/ticketController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').get(getTickets).post(createTicket);
router.route('/:id').get(getTicketById).put(updateTicket).patch(updateTicket).delete(authorizeRoles('admin'), deleteTicket);

module.exports = router;
