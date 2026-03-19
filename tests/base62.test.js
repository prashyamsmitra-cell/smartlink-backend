const { generateCode, toBase62, isValidCode } = require('../utils/base62');

describe('Base62 utilities', () => {
  describe('toBase62()', () => {
    it('encodes 0n as padded zeros', () => {
      expect(toBase62(0n, 7)).toBe('0000000');
    });

    it('encodes known values correctly', () => {
      expect(toBase62(62n, 2)).toBe('10'); // 1*62 + 0 = 62
      expect(toBase62(63n, 2)).toBe('11'); // 1*62 + 1 = 63
    });

    it('pads to the requested length', () => {
      const code = toBase62(1n, 7);
      expect(code).toHaveLength(7);
      expect(code).toBe('0000001');
    });
  });

  describe('generateCode()', () => {
    it('returns a string of exactly CODE_LENGTH (7) characters', () => {
      for (let i = 0; i < 20; i++) {
        const code = generateCode();
        expect(typeof code).toBe('string');
        expect(code).toHaveLength(7);
      }
    });

    it('only contains Base62 characters', () => {
      for (let i = 0; i < 50; i++) {
        expect(generateCode()).toMatch(/^[0-9A-Za-z]+$/);
      }
    });

    it('produces different codes on successive calls', () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateCode()));
      // With 62^7 possible codes, 100 calls should almost never collide
      expect(codes.size).toBeGreaterThan(95);
    });
  });

  describe('isValidCode()', () => {
    it('accepts valid Base62 codes', () => {
      expect(isValidCode('abc1234')).toBe(true);
      expect(isValidCode('ZZZZZZZ')).toBe(true);
      expect(isValidCode('0000000')).toBe(true);
    });

    it('rejects codes with special characters', () => {
      expect(isValidCode('abc!@#$')).toBe(false);
      expect(isValidCode('abc 123')).toBe(false);
      expect(isValidCode('../etc')).toBe(false);
    });

    it('rejects codes that are too short or too long', () => {
      expect(isValidCode('ab')).toBe(false);      // < 4 chars
      expect(isValidCode('a'.repeat(13))).toBe(false); // > 12 chars
    });

    it('rejects non-string inputs', () => {
      expect(isValidCode(null)).toBe(false);
      expect(isValidCode(undefined)).toBe(false);
      expect(isValidCode(12345)).toBe(false);
    });
  });
});
