const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');

router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
    },
  };

  try {
    await query('SELECT 1');
    health.services.database = 'ok';
  } catch {
    health.services.database = 'error';
    health.status = 'degraded';
  }

  const httpStatus = health.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(health);
});

module.exports = router;
