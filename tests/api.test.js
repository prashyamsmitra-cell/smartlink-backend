const request = require('supertest');

// ── Mock DB & Redis before requiring app ──────────────────────────────────────
jest.mock('../database/connection', () => ({
  connectDB: jest.fn().mockResolvedValue(),
  query: jest.fn(),
}));

jest.mock('../database/migrations', () => ({
  runMigrations: jest.fn().mockResolvedValue(),
}));

jest.mock('../cache/redisClient', () => ({
  connectRedis: jest.fn().mockResolvedValue(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(),
  del: jest.fn().mockResolvedValue(),
}));

const app = require('../app');
const db  = require('../database/connection');

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockUrl = {
  id:            'uuid-1234',
  long_url:      'https://example.com/some/long/path',
  short_code:    'abc1234',
  created_at:    new Date().toISOString(),
  click_count:   5,
  last_accessed: new Date().toISOString(),
};

// ── Health ────────────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 with status ok when DB is reachable', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });

    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.services.database).toBe('ok');
  });

  it('returns 503 when DB is unreachable', async () => {
    db.query.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(503);
    expect(res.body.services.database).toBe('error');
  });
});

// ── POST /api/shorten ─────────────────────────────────────────────────────────
describe('POST /api/shorten', () => {
  beforeEach(() => {
    // generateUniqueCode does a SELECT to check for collision
    db.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // no collision
      .mockResolvedValueOnce({ rows: [mockUrl], rowCount: 1 }); // INSERT
  });

  it('returns 201 with shortUrl for a valid URL', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/some/long/path' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('shortCode');
    expect(res.body.data).toHaveProperty('shortUrl');
    expect(res.body.data).toHaveProperty('longUrl');
  });

  it('returns 400 when url field is missing', async () => {
    const res = await request(app).post('/api/shorten').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a non-http(s) URL', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'ftp://example.com' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for a localhost URL (SSRF prevention)', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'http://localhost:8080/admin' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for a malformed URL', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'not-a-url' });
    expect(res.statusCode).toBe(400);
  });
});

// ── GET /api/stats/:shortCode ─────────────────────────────────────────────────
describe('GET /api/stats/:shortCode', () => {
  it('returns stats for a known short code', async () => {
    db.query.mockResolvedValueOnce({ rows: [mockUrl], rowCount: 1 });

    const res = await request(app).get(`/api/stats/${mockUrl.short_code}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.clickCount).toBe(mockUrl.click_count);
  });

  it('returns 404 for an unknown short code', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/api/stats/unknown1');
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 for an invalid short code format', async () => {
    const res = await request(app).get('/api/stats/!!invalid!!');
    expect(res.statusCode).toBe(400);
  });
});

// ── GET /:shortCode (redirect) ────────────────────────────────────────────────
describe('GET /:shortCode', () => {
  it('redirects 301 to the long URL', async () => {
    // incrementClick returns the updated row
    db.query.mockResolvedValueOnce({ rows: [mockUrl], rowCount: 1 });

    const res = await request(app).get(`/${mockUrl.short_code}`);
    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe(mockUrl.long_url);
  });

  it('returns 404 for an unknown short code', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/notfound');
    expect(res.statusCode).toBe(404);
  });
});

// ── GET /api/recent ───────────────────────────────────────────────────────────
describe('GET /api/recent', () => {
  it('returns an array of recent URLs', async () => {
    db.query.mockResolvedValueOnce({ rows: [mockUrl, mockUrl], rowCount: 2 });

    const res = await request(app).get('/api/recent');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
  });
});
