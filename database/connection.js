const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

/**
 * Creates and returns a PostgreSQL connection pool.
 * Re-uses the existing pool if already initialised.
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error', { error: err.message });
    });
  }
  return pool;
}

/**
 * Verifies connectivity by running a lightweight query.
 * Retries up to `maxRetries` times with exponential backoff.
 */
async function connectDB(maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await getPool().connect();
      await client.query('SELECT 1');
      client.release();
      return;
    } catch (err) {
      logger.warn(`DB connection attempt ${attempt}/${maxRetries} failed`, { error: err.message });
      if (attempt === maxRetries) throw err;
      await delay(Math.min(1000 * 2 ** attempt, 10_000)); // exponential backoff, cap 10s
    }
  }
}

/**
 * Executes a parameterised query with a single retry on transient failures.
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await getPool().query(text, params);
    logger.debug('DB query executed', { duration: Date.now() - start, rows: result.rowCount });
    return result;
  } catch (err) {
    logger.error('DB query error', { error: err.message, query: text });
    throw err;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { connectDB, query, getPool };
