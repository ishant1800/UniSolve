const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const { emitToAdmins } = require('../services/socketService');

const markAtRiskTickets = async () => {
  const now = new Date();
  const bufferMs = 30 * 60 * 1000;
  const threshold = new Date(now.getTime() + bufferMs);

  const atRiskTickets = await Ticket.find({
    deadline: { $gte: now, $lte: threshold },
    status: { $nin: ['Resolved', 'Escalated', 'Closed'] },
    slaStatus: { $ne: 'AtRisk' },
  });

  if (!atRiskTickets.length) {
    return;
  }

  const updatePromises = atRiskTickets.map(async (ticket) => {
    ticket.slaStatus = 'AtRisk';
    const savedTicket = await ticket.save();

    emitToAdmins('slaUpdated', {
      type: 'risk',
      ticketId: savedTicket._id,
    });

    return savedTicket;
  });

  await Promise.all(updatePromises);
};

const escalateOverdueTickets = async () => {
  const now = new Date();

  const overdueTickets = await Ticket.find({
    deadline: { $lt: now },
    status: { $nin: ['Resolved', 'Escalated', 'Closed'] },
  });

  if (!overdueTickets.length) {
    return;
  }

  const ticketIds = overdueTickets.map((ticket) => ticket._id.toString());

  const updatePromises = overdueTickets.map(async (ticket) => {
    ticket.status = 'Escalated';
    ticket.slaStatus = 'Breached';
    ticket.escalatedAt = new Date();
    const savedTicket = await ticket.save();

    emitToAdmins('ticketEscalated', {
      ticketId: savedTicket._id,
      title: savedTicket.title,
      priority: savedTicket.priority,
    });

    emitToAdmins('slaUpdated', {
      type: 'breach',
      ticketId: savedTicket._id,
    });

    return savedTicket;
  });

  const updatedTickets = await Promise.all(updatePromises);
  console.log(`SLA escalation job escalated ${updatedTickets.length} ticket(s): ${ticketIds.join(', ')}`);

  emitToAdmins('ticketsEscalated', updatedTickets);
};

const startSlaJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await markAtRiskTickets();
      await escalateOverdueTickets();
    } catch (error) {
      console.error('SLA escalation job failed:', error);
    }
  });
};

module.exports = { startSlaJob };
