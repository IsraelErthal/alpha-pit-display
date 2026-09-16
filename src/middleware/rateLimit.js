function rateLimit({ windowMs, max }) {
  const buckets = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = buckets.get(key);
    const current = !entry || entry.resetAt <= now ? { count: 0, resetAt: now + windowMs } : entry;
    current.count += 1;
    buckets.set(key, current);
    if (current.count > max) {
      res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1_000)));
      return res.status(429).json({ error: 'Muitas solicitações. Tente novamente em instantes.' });
    }
    return next();
  };
}

module.exports = { rateLimit };
