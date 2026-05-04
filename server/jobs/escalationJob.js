const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const { emitToAdmins } = require('../services/socketService');

const escalateOverdueTickets = async () => {
  const now = new Date();

  const overdueTickets = await Ticket.find({
    deadline: { $lt: now },
    status: { $in: ['Open', 'In Progress'] },
  });

  if (!overdueTickets.length) {
    return;
  }

  const updatePromises = overdueTickets.map(async (ticket) => {
    ticket.status = 'Escalated';
    await ticket.save();
    return ticket;
  });

  const updatedTickets = await Promise.all(updatePromises);
  emitToAdmins('ticketsEscalated', updatedTickets);
};

const startEscalationJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await escalateOverdueTickets();
    } catch (error) {
      console.error('Escalation job failed:', error);
    }
  });
};

module.exports = { startEscalationJob };
