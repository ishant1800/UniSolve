export const getTimeLeft = (deadline) => {
  if (!deadline) {
    return '00:00';
  }

  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) {
    return '00:00';
  }

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
