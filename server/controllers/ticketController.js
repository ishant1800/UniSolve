const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { calculateDeadline, getSlaStatus } = require('../services/slaService');
const { emitToAdmins, emitToUser } = require('../services/socketService');

const createTicket = async (req, res, next) => {
  try {
    const { title, description, department, priority, assignedTo } = req.body;

    if (!title || !description || !department) {
      return res.status(400).json({ message: 'Title, description and department are required' });
    }

    const deadline = calculateDeadline(priority || 'Medium');
    const slaStatus = getSlaStatus(deadline);

    const ticket = await Ticket.create({
      title,
      description,
      department,
      priority: priority || 'Medium',
      createdBy: req.user._id,
      deadline,
      slaStatus,
      assignedTo,
    });

    emitToAdmins('ticketCreated', ticket);
    emitToUser(ticket.createdBy.toString(), 'myTicketUpdate', ticket);

    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
};

const getTickets = async (req, res, next) => {
  try {
    const query = req.user.role === 'user' ? { createdBy: req.user._id } : {};
    const { slaStatus, priority, status, assignedTo } = req.query;

    if (assignedTo === 'me') {
      query.assignedTo = req.user._id;
    }

    const whitelist = {
      slaStatus: ['OnTime', 'AtRisk', 'Breached'],
      priority: ['Low', 'Medium', 'High'],
      status: ['Open', 'In Progress', 'Resolved', 'Escalated', 'Closed'],
    };

    const parseFilter = (value, allowedValues) => {
      if (!value) return undefined;
      const values = Array.isArray(value)
        ? value
        : String(value).split(',').map((item) => item.trim()).filter(Boolean);

      const filtered = values.filter((item) => allowedValues.includes(item));
      if (!filtered.length) {
        return null;
      }

      return filtered.length === 1 ? filtered[0] : { $in: filtered };
    };

    const slaStatusFilter = parseFilter(slaStatus, whitelist.slaStatus);
    const priorityFilter = parseFilter(priority, whitelist.priority);
    const statusFilter = parseFilter(status, whitelist.status);

    if (slaStatus && slaStatusFilter === null) {
      return res.status(400).json({ message: 'Invalid slaStatus filter' });
    }
    if (priority && priorityFilter === null) {
      return res.status(400).json({ message: 'Invalid priority filter' });
    }
    if (status && statusFilter === null) {
      return res.status(400).json({ message: 'Invalid status filter' });
    }

    if (slaStatusFilter) query.slaStatus = slaStatusFilter;
    if (priorityFilter) query.priority = priorityFilter;
    if (statusFilter) query.status = statusFilter;

    const tickets = await Ticket.find(query)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    next(error);
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role === 'user' && !ticket.createdBy._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(ticket);
  } catch (error) {
    next(error);
  }
};

const updateTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const isOwner = ticket.createdBy.equals(req.user._id);
    const isAgentOrAdmin = ['agent', 'admin'].includes(req.user.role);

    if (req.user.role === 'user' && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const allowedFields = ['title', 'description'];
    if (isAgentOrAdmin) {
      allowedFields.push('department', 'priority', 'status', 'assignedTo');
    }

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        ticket[field] = req.body[field];
      }
    });

    if (req.body.priority) {
      ticket.deadline = calculateDeadline(req.body.priority);
      ticket.slaStatus = getSlaStatus(ticket.deadline);
    }

    const previousStatus = ticket.status;
    const previousSlaStatus = ticket.slaStatus;

    if (req.body.status === 'Resolved') {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role');

    emitToAdmins('ticketUpdated', updatedTicket);
    emitToUser(updatedTicket.createdBy._id.toString(), 'myTicketUpdate', updatedTicket);

    if (updatedTicket.assignedTo) {
      emitToUser(updatedTicket.assignedTo._id.toString(), 'myTicketUpdate', updatedTicket);
    }

    if (updatedTicket.slaStatus !== previousSlaStatus) {
      emitToAdmins('slaUpdated', {
        type: updatedTicket.slaStatus === 'Breached' ? 'breach' : updatedTicket.slaStatus === 'AtRisk' ? 'risk' : 'update',
        ticketId: updatedTicket._id,
      });
    }

    if (previousStatus !== 'Escalated' && req.body.status === 'Escalated') {
      emitToAdmins('ticketEscalated', {
        ticketId: ticket._id,
        title: ticket.title,
        priority: ticket.priority,
      });
      emitToAdmins('slaUpdated', {
        type: 'breach',
        ticketId: ticket._id,
      });
    }

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
};

const assignTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isAgent = req.user.role === 'agent';

    if (!isAdmin && !isAgent) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    // If agentId is provided, verify it is a valid agent
    let targetAgent = null;
    if (agentId) {
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(agentId)) {
        return res.status(400).json({ message: 'Invalid agentId format' });
      }

      targetAgent = await User.findById(agentId);
      if (!targetAgent || targetAgent.role !== 'agent') {
        return res.status(400).json({ message: 'Target user is not a valid agent' });
      }
    }

    if (isAgent && !isAdmin) {
      // Agents can only claim unassigned tickets for themselves, or release their own tickets
      if (agentId) {
        if (agentId !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Agents can only claim tickets for themselves' });
        }
        if (ticket.assignedTo && !ticket.assignedTo.equals(req.user._id)) {
          return res.status(403).json({ message: 'Ticket is already assigned to another agent' });
        }
      } else {
        if (!ticket.assignedTo || !ticket.assignedTo.equals(req.user._id)) {
          return res.status(403).json({ message: 'Agents can only release their own tickets' });
        }
      }
    }

    // Determine event type
    let socketEvent = 'ticketAssigned';
    if (!agentId) {
      socketEvent = 'ticketUnassigned';
    } else if (ticket.assignedTo && !ticket.assignedTo.equals(agentId)) {
      socketEvent = 'ticketReassigned';
    }

    const previousAssignee = ticket.assignedTo;

    ticket.assignedTo = agentId || null;
    ticket.assignedBy = agentId ? req.user._id : null;
    ticket.assignedAt = agentId ? new Date() : null;

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email role');

    // Socket broadcasts
    const { emitToAdmins, emitToUser } = require('../services/socketService');
    emitToAdmins(socketEvent, populatedTicket);
    emitToUser(populatedTicket.createdBy._id.toString(), 'myTicketUpdate', populatedTicket);

    if (populatedTicket.assignedTo) {
      emitToUser(populatedTicket.assignedTo._id.toString(), 'myTicketUpdate', populatedTicket);
    }
    if (previousAssignee && previousAssignee.toString() !== (populatedTicket.assignedTo?._id?.toString() || '')) {
      emitToUser(previousAssignee.toString(), 'myTicketUpdate', populatedTicket);
    }

    res.json(populatedTicket);
  } catch (error) {
    next(error);
  }
};

const deleteTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete tickets' });
    }

    await ticket.deleteOne();
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTicket, getTickets, getTicketById, updateTicket, deleteTicket, assignTicket };
