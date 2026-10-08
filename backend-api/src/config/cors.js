const configuredOrigins = (process.env.APP_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

if (configuredOrigins.length === 0) {
  throw new Error('APP_URL must contain at least one allowed frontend origin');
}

const allowedOrigins = new Set(configuredOrigins);

module.exports = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
};
