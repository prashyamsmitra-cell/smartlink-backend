const urlService = require('../services/urlService');
const { isValidCode } = require('../utils/base62');
const logger = require('../utils/logger');

/**
 * POST /api/shorten
 * Body: { url: string }
 */
async function shorten(req, res, next) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Request body must include a "url" field' });
    }

    const record = await urlService.shortenUrl(url);

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    return res.status(201).json({
      success: true,
      data: {
        id: record.id,
        shortCode: record.short_code,
        shortUrl: `${baseUrl}/${record.short_code}`,
        longUrl: record.long_url,
        createdAt: record.created_at,
        clickCount: record.click_count,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /:shortCode
 * Redirects to the original URL.
 */
async function redirect(req, res, next) {
  try {
    const { shortCode } = req.params;

    if (!isValidCode(shortCode)) {
      return res.status(400).json({ error: 'Invalid short code format' });
    }

    const longUrl = await urlService.resolveUrl(shortCode);
    logger.info('Redirect', { shortCode, longUrl, ip: req.ip });

    return res.redirect(301, longUrl);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/stats/:shortCode
 * Returns analytics for a short link.
 */
async function getStats(req, res, next) {
  try {
    const { shortCode } = req.params;

    if (!isValidCode(shortCode)) {
      return res.status(400).json({ error: 'Invalid short code format' });
    }

    const record = await urlService.getStats(shortCode);
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    return res.json({
      success: true,
      data: {
        id: record.id,
        shortCode: record.short_code,
        shortUrl: `${baseUrl}/${record.short_code}`,
        longUrl: record.long_url,
        clickCount: record.click_count,
        createdAt: record.created_at,
        lastAccessed: record.last_accessed,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/recent
 * Returns the 10 most recently created links.
 */
async function getRecent(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const records = await urlService.getRecentUrls(limit);
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    return res.json({
      success: true,
      data: records.map((r) => ({
        id: r.id,
        shortCode: r.short_code,
        shortUrl: `${baseUrl}/${r.short_code}`,
        longUrl: r.long_url,
        clickCount: r.click_count,
        createdAt: r.created_at,
        lastAccessed: r.last_accessed,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { shorten, redirect, getStats, getRecent };
