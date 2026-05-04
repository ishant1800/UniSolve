const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    department: {
      type: String,
      enum: ['IT', 'Facilities', 'Admin'],
      required: [true, 'Department is required'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Escalated', 'Closed'],
      default: 'Open',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    slaStatus: {
      type: String,
      enum: ['OnTime', 'AtRisk', 'Breached'],
      default: 'OnTime',
    },
    resolvedAt: {
      type: Date,
    },
    escalatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ slaStatus: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ status: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
