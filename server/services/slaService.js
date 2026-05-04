const calculateDeadline = (priority) => {
  const now = new Date();
  const deadline = new Date(now);

  switch (priority) {
    case 'High':
      deadline.setHours(deadline.getHours() + 4);
      break;
    case 'Medium':
      deadline.setHours(deadline.getHours() + 12);
      break;
    case 'Low':
    default:
      deadline.setHours(deadline.getHours() + 24);
      break;
  }

  return deadline;
};

const getSlaStatus = (deadline) => {
  const now = new Date();
  if (!deadline) {
    return 'OnTime';
  }

  if (now > deadline) {
    return 'Breached';
  }

  const millisecondsUntilDeadline = deadline - now;
  const bufferMs = 30 * 60 * 1000;

  return millisecondsUntilDeadline <= bufferMs ? 'AtRisk' : 'OnTime';
};

module.exports = {
  calculateDeadline,
  determineDeadline: calculateDeadline,
  getSlaStatus,
};
