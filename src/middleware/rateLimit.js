const buckets = new Map();

function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = buckets.get(key);
    const current = !entry || entry.resetAt <= now ? { count: 0, resetAt: now + windowMs } : entry;
    current.count += 1;
    buckets.set(key, current);
    if (current.count > max) return res.status(429).json({ error: 'Muitas solicitações. Tente novamente em instantes.' });
    return next();
  };
}

module.exports = { rateLimit };
