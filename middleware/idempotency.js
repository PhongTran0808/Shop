const { queryGet, queryRun } = require('../config/database');

async function handleIdempotency(req, res, next) {
  const idempotencyKey = req.headers['x-idempotency-key'];
  if (!idempotencyKey) {
    return next();
  }

  try {
    const existing = await queryGet('SELECT response_body FROM idempotency_keys WHERE key = ?', [idempotencyKey]);
    if (existing) {
      return res.status(200).json(JSON.parse(existing.response_body));
    }
  } catch (err) {}

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      queryRun('INSERT OR IGNORE INTO idempotency_keys (key, response_body) VALUES (?, ?)', [
        idempotencyKey,
        JSON.stringify(body)
      ]).catch(() => {});
    }
    return originalJson(body);
  };

  next();
}

module.exports = {
  handleIdempotency
};
