const rateLimitStore = new Map();

/**
 * Custom memory-based sliding window rate limiter.
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds (default: 1 min)
 * @param {number} options.max Maximum requests per window (default: 60)
 * @param {string} options.message Error message response
 */
const rateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 60;
  const message = options.message || 'Too many requests, please try again later.';

  // Periodic cleanup of stale rateLimitStore entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitStore.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < windowMs);
      if (validTimestamps.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, validTimestamps);
      }
    }
  }, 5 * 60 * 1000);

  // Allow Node process to exit cleanly if this is the only active handle
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.originalUrl || req.path}:${ip}`;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const timestamps = rateLimitStore.get(key);
    // Filter timestamps falling outside the sliding window
    const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (activeTimestamps.length >= max) {
      const oldestTimestamp = activeTimestamps[0];
      const resetTime = oldestTimestamp ? Math.max(0, windowMs - (now - oldestTimestamp)) : windowMs;
      
      res.setHeader('Retry-After', Math.ceil(resetTime / 1000));
      return res.status(429).json({
        message,
        retryAfterMs: resetTime,
      });
    }

    activeTimestamps.push(now);
    rateLimitStore.set(key, activeTimestamps);

    // Set standard rate limiting response headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - activeTimestamps.length));
    
    next();
  };
};

module.exports = rateLimiter;
