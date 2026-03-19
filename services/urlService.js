const urlModel = require('../models/urlModel');
const { generateUniqueCode } = require('../utils/base62');
const { validateUrl } = require('../utils/urlValidator');
const cache = require('../cache/redisClient');
const logger = require('../utils/logger');

const CACHE_PREFIX = 'url:';
const CACHE_TTL = 3600; // 1 hour

/**
 * Shorten a long URL.
 * Returns the newly created URL record.
 * @throws {Error} with `statusCode` property on validation / conflict errors
 */
async function shortenUrl(rawUrl) {
  // 1. Validate & sanitise
  const { valid, url, reason } = validateUrl(rawUrl);
  if (!valid) {
    const err = new Error(reason);
    err.statusCode = 400;
    throw err;
  }

  // 2. Generate a collision-free short code
  const shortCode = await generateUniqueCode();

  // 3. Persist to DB
  const record = await urlModel.createUrl(url, shortCode);

  // 4. Prime the cache
  await cache.set(`${CACHE_PREFIX}${shortCode}`, url, CACHE_TTL);

  logger.info('URL shortened', { shortCode, longUrl: url });

  return record;
}

/**
 * Resolve a short code to its long URL.
 * Increments click analytics asynchronously.
 *
 * @returns {string} The long URL to redirect to
 * @throws {Error} with statusCode 404 when code is unknown
 */
async function resolveUrl(shortCode) {
  const cacheKey = `${CACHE_PREFIX}${shortCode}`;

  // 1. Check Redis first
  const cached = await cache.get(cacheKey);
  if (cached) {
    // Fire-and-forget analytics update
    urlModel.incrementClick(shortCode).catch((err) =>
      logger.error('Failed to increment click (cached path)', { error: err.message })
    );
    return cached;
  }

  // 2. Fall back to DB
  const record = await urlModel.incrementClick(shortCode);
  if (!record) {
    const err = new Error('Short link not found');
    err.statusCode = 404;
    throw err;
  }

  // 3. Refresh cache
  await cache.set(cacheKey, record.long_url, CACHE_TTL);

  return record.long_url;
}

/**
 * Returns analytics for a short code.
 * @throws {Error} with statusCode 404 when code is unknown
 */
async function getStats(shortCode) {
  const record = await urlModel.getStats(shortCode);
  if (!record) {
    const err = new Error('Short link not found');
    err.statusCode = 404;
    throw err;
  }
  return record;
}

/**
 * Returns up to `limit` recently created links.
 */
async function getRecentUrls(limit = 10) {
  return urlModel.getRecentUrls(limit);
}

module.exports = { shortenUrl, resolveUrl, getStats, getRecentUrls };
