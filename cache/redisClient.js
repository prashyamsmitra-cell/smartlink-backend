const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;
let isConnected = false;

const DEFAULT_TTL = 3600; // seconds (1 hour)

function connectRedis() {
  if (!process.env.REDIS_URL) {
    logger.info('Redis URL not configured, cache disabled');
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    client.on('connect', () => {
      isConnected = true;
      redis = client;
      logger.info('Redis client connected');
    });

    client.on('error', (err) => {
      isConnected = false;
      logger.warn('Redis error', { error: err.message });
    });

    client.on('close', () => {
      isConnected = false;
    });

    client.connect()
      .then(() => resolve(client))
      .catch((err) => reject(err));
  });
}

/**
 * Get a value from Redis.  Returns null if Redis is unavailable.
 */
async function get(key) {
  if (!isConnected || !redis) return null;
  try {
    const value = await redis.get(key);
    if (value) {
      logger.debug('Cache HIT', { key });
    } else {
      logger.debug('Cache MISS', { key });
    }
    return value;
  } catch (err) {
    logger.warn('Redis GET error (falling back)', { error: err.message });
    return null;
  }
}

/**
 * Set a value in Redis with an optional TTL (seconds).
 * Silently fails if Redis is unavailable.
 */
async function set(key, value, ttl = DEFAULT_TTL) {
  if (!isConnected || !redis) return;
  try {
    await redis.set(key, value, 'EX', ttl);
    logger.debug('Cache SET', { key, ttl });
  } catch (err) {
    logger.warn('Redis SET error', { error: err.message });
  }
}

/**
 * Invalidate a key in Redis.
 */
async function del(key) {
  if (!isConnected || !redis) return;
  try {
    await redis.del(key);
    logger.debug('Cache DEL', { key });
  } catch (err) {
    logger.warn('Redis DEL error', { error: err.message });
  }
}

module.exports = { connectRedis, get, set, del, DEFAULT_TTL };
