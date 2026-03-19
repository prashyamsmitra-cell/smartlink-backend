const logger = require('../utils/logger');

/**
 * Express centralised error handling middleware.
 * Must be registered LAST in the middleware chain.
 */
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error('Request error', {
    message,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: statusCode === 500 ? err.stack : undefined,
  });

  // Never expose internal details in production
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    error: isProduction && statusCode === 500 ? 'Internal server error' : message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = { errorHandler };
