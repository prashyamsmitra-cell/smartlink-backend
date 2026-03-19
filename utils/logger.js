const { createLogger, format, transports } = require('winston');

const { combine, timestamp, errors, json, colorize, simple } = format;

const isDev = process.env.NODE_ENV !== 'production';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'smartlink-api' },
  transports: [
    // Always write JSON logs to stdout (captured by Railway / Docker)
    new transports.Console({
      format: isDev
        ? combine(colorize(), simple()) // human-friendly in local dev
        : combine(timestamp(), json()),  // structured JSON in prod
    }),
  ],
});

module.exports = logger;
