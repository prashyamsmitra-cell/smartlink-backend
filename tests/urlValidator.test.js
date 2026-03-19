const { validateUrl } = require('../utils/urlValidator');

describe('validateUrl()', () => {
  it('accepts valid http URLs', () => {
    const result = validateUrl('http://example.com');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('http://example.com/');
  });

  it('accepts valid https URLs', () => {
    const result = validateUrl('https://www.google.com/search?q=hello');
    expect(result.valid).toBe(true);
  });

  it('trims whitespace before validating', () => {
    const result = validateUrl('  https://example.com  ');
    expect(result.valid).toBe(true);
  });

  it('rejects empty strings', () => {
    expect(validateUrl('').valid).toBe(false);
    expect(validateUrl('   ').valid).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(validateUrl(null).valid).toBe(false);
    expect(validateUrl(123).valid).toBe(false);
  });

  it('rejects ftp:// URLs', () => {
    expect(validateUrl('ftp://files.example.com').valid).toBe(false);
  });

  it('rejects javascript: URLs', () => {
    expect(validateUrl('javascript:alert(1)').valid).toBe(false);
  });

  it('rejects localhost (SSRF)', () => {
    expect(validateUrl('http://localhost').valid).toBe(false);
    expect(validateUrl('http://localhost:8080').valid).toBe(false);
  });

  it('rejects 127.x.x.x addresses (SSRF)', () => {
    expect(validateUrl('http://127.0.0.1').valid).toBe(false);
  });

  it('rejects private IP ranges (SSRF)', () => {
    expect(validateUrl('http://192.168.1.1').valid).toBe(false);
    expect(validateUrl('http://10.0.0.1').valid).toBe(false);
    expect(validateUrl('http://172.16.0.1').valid).toBe(false);
  });

  it('rejects URLs exceeding max length', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2050);
    expect(validateUrl(longUrl).valid).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(validateUrl('not-a-url').valid).toBe(false);
    expect(validateUrl('://missing-protocol').valid).toBe(false);
  });
});
