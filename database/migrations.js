const { query } = require('./connection');
const logger = require('../utils/logger');

/**
 * Runs all SQL migrations in order.
 * Safe to call on every boot — uses IF NOT EXISTS / idempotent DDL.
 */
async function runMigrations() {
  logger.info('Running database migrations…');

  // Enable the pgcrypto extension for gen_random_uuid()
  await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  // Core urls table
  await query(`
    CREATE TABLE IF NOT EXISTS urls (
      id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      long_url      TEXT          NOT NULL,
      short_code    VARCHAR(12)   NOT NULL UNIQUE,
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      click_count   INTEGER       NOT NULL DEFAULT 0,
      last_accessed TIMESTAMPTZ
    )
  `);

  // Index for fast look-ups by short_code
  await query(`
    CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls (short_code)
  `);

  // Index for listing recently created links
  await query(`
    CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls (created_at DESC)
  `);

  logger.info('✅ Migrations complete');
}

module.exports = { runMigrations };
