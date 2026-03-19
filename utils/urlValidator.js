const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const MAX_URL_LENGTH = 2048;

/**
 * Validates and sanitises a URL string.
 *
 * Returns `{ valid: true, url: <sanitisedURL> }` on success or
 * `{ valid: false, reason: <string> }` on failure.
 */
function validateUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    return { valid: false, reason: 'URL must be a string' };
  }

  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return { valid: false, reason: 'URL cannot be empty' };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, reason: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters` };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'URL is malformed — must include a valid protocol and hostname' };
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return { valid: false, reason: `Protocol "${parsed.protocol}" is not allowed. Use http or https.` };
  }

  if (!parsed.hostname || parsed.hostname.length < 2) {
    return { valid: false, reason: 'URL must have a valid hostname' };
  }

  // Block localhost / private IPs to prevent SSRF
  const hostname = parsed.hostname.toLowerCase();
  const privatePatterns = [
    /^localhost$/,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^0\.0\.0\.0$/,
    /^::1$/,
  ];
  if (privatePatterns.some((re) => re.test(hostname))) {
    return { valid: false, reason: 'Shortening private/internal addresses is not allowed' };
  }

  return { valid: true, url: parsed.href };
}

module.exports = { validateUrl };
