const { query } = require('../database/connection');

/**
 * Inserts a new URL record and returns the created row.
 */
async function createUrl(longUrl, shortCode) {
  const { rows } = await query(
    `INSERT INTO urls (long_url, short_code)
     VALUES ($1, $2)
     RETURNING id, long_url, short_code, created_at, click_count, last_accessed`,
    [longUrl, shortCode]
  );
  return rows[0];
}

/**
 * Finds a URL by its short code.
 * Returns the row or null if not found.
 */
async function findByShortCode(shortCode) {
  const { rows } = await query(
    `SELECT id, long_url, short_code, created_at, click_count, last_accessed
     FROM urls
     WHERE short_code = $1`,
    [shortCode]
  );
  return rows[0] || null;
}

/**
 * Increments click_count and sets last_accessed to NOW().
 * Returns the updated row.
 */
async function incrementClick(shortCode) {
  const { rows } = await query(
    `UPDATE urls
     SET click_count   = click_count + 1,
         last_accessed = NOW()
     WHERE short_code  = $1
     RETURNING id, long_url, short_code, created_at, click_count, last_accessed`,
    [shortCode]
  );
  return rows[0] || null;
}

/**
 * Returns the N most recently created URLs (for the "recent links" table).
 */
async function getRecentUrls(limit = 10) {
  const { rows } = await query(
    `SELECT id, long_url, short_code, created_at, click_count, last_accessed
     FROM urls
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * Returns the full stats row for a given short code.
 */
async function getStats(shortCode) {
  return findByShortCode(shortCode);
}

module.exports = { createUrl, findByShortCode, incrementClick, getRecentUrls, getStats };
