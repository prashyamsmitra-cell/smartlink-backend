/**
 * Centralised config module.
 * All environment variables are read here — never scattered across the codebase.
 * Throws at startup if a required variable is missing so failures are immediate.
 */

function require_env(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional_env(key, fallback = '') {
  return process.env[key] || fallback;
}

const config = {
  env:      optional_env('NODE_ENV', 'development'),
  port:     parseInt(optional_env('PORT', '5000'), 10),
  baseUrl:  optional_env('BASE_URL', 'http://localhost:5000'),

  db: {
    url: require_env('DATABASE_URL'),
  },

  redis: {
    url: optional_env('REDIS_URL', ''), // optional — app runs without Redis
  },

  cors: {
    // Comma-separated list of allowed origins
    origins: optional_env('ALLOWED_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },

  log: {
    level: optional_env('LOG_LEVEL', 'info'),
  },

  isProd: process.env.NODE_ENV === 'production',
  isDev:  process.env.NODE_ENV !== 'production',
};

module.exports = config;
