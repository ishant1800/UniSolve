export const getTimeLeft = (deadline) => {
  if (!deadline) {
    return 'N/A';
  }

  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) {
    return 'N/A';
  }

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) {
    return 'Expired';
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

