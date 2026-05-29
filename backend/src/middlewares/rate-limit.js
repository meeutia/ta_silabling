function getClientKey(req, keyPrefix = 'default') {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
  return `${keyPrefix}:${ip}`;
}

function createRateLimit({
  windowMs = 60 * 1000,
  max = 60,
  keyPrefix = 'default',
  message = 'Terlalu banyak request. Silakan coba lagi beberapa saat.',
} = {}) {
  const buckets = new Map();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (!bucket || bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.max(windowMs, 60 * 1000));

  if (typeof cleanupInterval.unref === 'function') cleanupInterval.unref();

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = getClientKey(req, keyPrefix);
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(max - bucket.count, 0)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    return next();
  };
}

module.exports = {
  createRateLimit,
};
