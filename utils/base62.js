const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = BigInt(CHARSET.length); // 62
const CODE_LENGTH = 7; // produces ~3.5 trillion unique combinations
const MAX_ATTEMPTS = 5;

const urlModel = require('../models/urlModel');
const logger = require('./logger');

/**
 * Encodes a positive BigInt into a Base62 string of exactly `length` chars.
 */
function toBase62(num, length = CODE_LENGTH) {
  let result = '';
  while (num > 0n) {
    result = CHARSET[Number(num % BASE)] + result;
    num = num / BASE;
  }
  // Left-pad with '0' if shorter than desired length
  return result.padStart(length, '0');
}

/**
 * Generates a cryptographically random Base62 short code.
 */
function generateCode() {
  // Use 6 random bytes → 48-bit number → encodes to ≤ 8 Base62 chars
  const randomBytes = Buffer.alloc(6);
  for (let i = 0; i < 6; i++) {
    randomBytes[i] = Math.floor(Math.random() * 256);
  }
  const num = BigInt('0x' + randomBytes.toString('hex'));
  return toBase62(num).slice(-CODE_LENGTH);
}

/**
 * Returns a unique short code that does not already exist in the database.
 * Retries on collision up to MAX_ATTEMPTS times.
 *
 * @throws {Error} if a unique code cannot be generated within the retry budget
 */
async function generateUniqueCode() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const code = generateCode();

    const existing = await urlModel.findByShortCode(code);

    if (!existing) {
      logger.debug('Generated unique short code', { code, attempt });
      return code;
    }

    logger.warn('Short code collision — retrying', { code, attempt });
  }

  throw new Error(`Failed to generate unique short code after ${MAX_ATTEMPTS} attempts`);
}

/**
 * Validates that a short code contains only Base62 characters and is the
 * expected length.  Prevents injection attacks before hitting the DB.
 */
function isValidCode(code) {
  if (typeof code !== 'string') return false;
  if (code.length < 4 || code.length > 12) return false;
  return /^[0-9A-Za-z]+$/.test(code);
}

module.exports = { generateUniqueCode, isValidCode, generateCode, toBase62 };
