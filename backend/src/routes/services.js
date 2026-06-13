const express = require('express');
const db = require('../db/connection');
const router = express.Router();

// GET /api/services — returns all active services
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, description, icon, tags FROM services WHERE is_active = TRUE ORDER BY sort_order'
    );
    res.json({ success: true, services: result.rows });
  } catch (err) {
    console.error('Services fetch error:', err.message);
    res.status(500).json({ error: 'Could not load services' });
  }
});

module.exports = router;
