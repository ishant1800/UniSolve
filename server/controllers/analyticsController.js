const Ticket = require('../models/Ticket');

const getStartDate = (range) => {
  const now = new Date();

  if (range === '24h') {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  if (range === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (range === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return null;
};

const buildSlaMetrics = async (range) => {
  const startDate = getStartDate(range);
  const match = {};

  if (startDate) {
    match.createdAt = { $gte: startDate };
  }

  const aggregation = await Ticket.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$slaStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  const totals = aggregation.reduce(
    (acc, item) => ({
      ...acc,
      [item._id]: item.count,
    }),
    {
      OnTime: 0,
      AtRisk: 0,
      Breached: 0,
    }
  );

  const totalTickets = await Ticket.countDocuments(match);
  const breachedCount = totals.Breached || 0;
  const complianceRate = totalTickets === 0 ? 100 : Math.round(((totalTickets - breachedCount) / totalTickets) * 100);

  return {
    onTime: totals.OnTime,
    atRisk: totals.AtRisk,
    breached: totals.Breached,
    complianceRate,
    totalTickets,
  };
};

const getSlaAnalytics = async (req, res, next) => {
  try {
    const range = req.query.range;
    const metrics = await buildSlaMetrics(range);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

const getSlaTrends = async (req, res, next) => {
  try {
    const range = req.query.range;
    const startDate = getStartDate(range);

    if (!startDate) {
      return res.status(400).json({ message: 'Invalid range, expected 24h, 7d, or 30d' });
    }

    const match = { createdAt: { $gte: startDate } };

    const trends = await Ticket.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          total: { $sum: 1 },
          breached: {
            $sum: {
              $cond: [{ $eq: ['$slaStatus', 'Breached'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total: 1,
          breached: 1,
        },
      },
    ]);

    res.json(trends);
  } catch (error) {
    next(error);
  }
};

const exportSlaReport = async (req, res, next) => {
  try {
    const range = req.query.range;
    const startDate = getStartDate(range);
    const match = {};

    if (startDate) {
      match.createdAt = { $gte: startDate };
    }

    const tickets = await Ticket.find(match, 'title department priority status slaStatus createdAt deadline escalatedAt').lean();

    const escapeCsv = (value) => {
      if (value === undefined || value === null) {
        return '';
      }

      const stringValue = String(value);
      const needsQuotes = /[",\n]/.test(stringValue);
      const escapedValue = stringValue.replace(/"/g, '""');
      return needsQuotes ? `"${escapedValue}"` : escapedValue;
    };

    const header = ['title', 'department', 'priority', 'status', 'slaStatus', 'createdAt', 'deadline', 'escalatedAt'];
    const csvRows = [header.join(',')];

    tickets.forEach((ticket) => {
      csvRows.push(
        [
          escapeCsv(ticket.title),
          escapeCsv(ticket.department),
          escapeCsv(ticket.priority),
          escapeCsv(ticket.status),
          escapeCsv(ticket.slaStatus),
          escapeCsv(ticket.createdAt?.toISOString()),
          escapeCsv(ticket.deadline?.toISOString()),
          escapeCsv(ticket.escalatedAt?.toISOString()),
        ].join(',')
      );
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sla-report.csv');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = { getSlaAnalytics, getSlaTrends, exportSlaReport };
