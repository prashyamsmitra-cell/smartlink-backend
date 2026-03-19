const express = require('express');
const router = express.Router();
const { shorten, redirect, getStats, getRecent } = require('../controllers/urlController');

// API routes
router.post('/shorten', shorten);
router.get('/stats/:shortCode', getStats);
router.get('/recent', getRecent);

// Redirect route (must come after API routes to avoid conflicts)
router.get('/:shortCode', redirect);

module.exports = router;
