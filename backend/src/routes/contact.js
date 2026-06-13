// ── CONTACT ROUTE ────────────────────────────────
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/connection');
const mailer = require('../middleware/mailer');
const router = express.Router();

router.post('/', [
  body('name').trim().isLength({ min:2, max:100 }).withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('message').trim().isLength({ min:10, max:1000 }).withMessage('Message must be 10-1000 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { name, email, message } = req.body;
  try {
    await db.query(
      'INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)',
      [name, email, message]
    );
    mailer.notifyContact({ name, email, message })
      .catch(err => console.warn('Contact email failed:', err.message));

    res.json({ success: true, message: 'Message received! I will reply within 24 hours.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
