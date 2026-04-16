require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { connectDB } = require('./database/connection');
const { connectRedis } = require('./cache/redisClient');
const { runMigrations } = require('./database/migrations');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (process.env.DATABASE_URL) {
      await connectDB();
      logger.info('PostgreSQL connected');

      await runMigrations();
      logger.info('Migrations complete');
    } else {
      logger.warn('DATABASE_URL not set, using local JSON storage');
    }

    try {
      await connectRedis();
      if (process.env.REDIS_URL) {
        logger.info('Redis connected');
      }
    } catch (err) {
      logger.warn('Redis unavailable, running without cache', { error: err.message });
    }

    app.listen(PORT, () => {
      logger.info(`SmartLink server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

startServer();
