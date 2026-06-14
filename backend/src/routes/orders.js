const express = require('express');
const { body, validationResult } = require('express-validator');
const db      = require('../db/connection');
const mailer  = require('../middleware/mailer');
const router  = express.Router();

const MIN_RATE = 80;

// ── VALIDATION RULES ─────────────────────────────
const VALID_CURRENCIES = ['INR','USD','GBP','EUR','AED','SGD','AUD','CAD'];

const orderValidation = [
  body('client_name').trim().isLength({ min:2, max:100 }).withMessage('Name must be 2-100 characters'),
  body('client_email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('client_company').optional().trim().isLength({ max:100 }),
  body('client_country').trim().isLength({ min:2, max:60 }).withMessage('Country required'),
  body('service_type').trim().isLength({ min:2, max:100 }).withMessage('Service type required'),
  body('project_description').trim().isLength({ min:30, max:2000 }).withMessage('Description must be 30-2000 characters'),
  body('estimated_hours').optional().isIn(['1-5','5-10','10-20','20-40','40+']),
  body('preferred_start_date').optional({ checkFalsy:true }).isISO8601().withMessage('Invalid date format'),
  body('hourly_rate_inr').isInt({ min: MIN_RATE }).withMessage(`Minimum rate is ₹${MIN_RATE}/hr`),
  body('currency').optional().isIn(VALID_CURRENCIES).withMessage('Invalid currency'),
  body('hourly_rate').optional().isFloat({ min: 0.01 }).withMessage('Invalid hourly rate'),
  body('referral_source').optional().trim().isLength({ max:50 }),
  body('additional_notes').optional().trim().isLength({ max:500 }),
];

// ── GENERATE ORDER ID ─────────────────────────────
function generateOrderId() {
  const date  = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const rand  = Math.random().toString(36).substring(2,7).toUpperCase();
  return `DT-${date}-${rand}`;
}

// ── POST /api/orders ──────────────────────────────
router.post('/', orderValidation, async (req, res) => {
  // Validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
      details: errors.array()
    });
  }

  const {
    client_name, client_email, client_company, client_country,
    service_type, project_description, estimated_hours,
    preferred_start_date, hourly_rate_inr, referral_source, additional_notes,
    currency = 'INR', hourly_rate
  } = req.body;

  // Extra security: enforce minimum rate
  if (hourly_rate_inr < MIN_RATE) {
    return res.status(400).json({ error: `Minimum hourly rate is ₹${MIN_RATE}` });
  }

  const orderId = generateOrderId();

  try {
    const result = await db.query(`
      INSERT INTO orders (
        order_id, client_name, client_email, client_company, client_country,
        service_type, project_description, estimated_hours, preferred_start_date,
        hourly_rate_inr, referral_source, additional_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id, order_id, created_at
    `, [
      orderId, client_name, client_email, client_company || null,
      client_country, service_type, project_description,
      estimated_hours || '10-20',
      preferred_start_date || null,
      hourly_rate_inr, referral_source || 'Other', additional_notes || null
    ]);

    const order = result.rows[0];

    // Send email notifications (non-blocking)
    mailer.notifyNewOrder({
      orderId, client_name, client_email, client_company,
      client_country, service_type, project_description,
      estimated_hours, hourly_rate_inr, currency, hourly_rate: hourly_rate || hourly_rate_inr
    }).catch(err => console.warn('Email notification failed:', err.message));

    console.log(`✅ New order: ${orderId} | ${service_type} | ${currency} ${hourly_rate || hourly_rate_inr}/hr | ${client_country}`);

    res.status(201).json({
      success: true,
      order_id: order.order_id,
      message: 'Order received! You will hear back within 24 hours.',
      created_at: order.created_at
    });

  } catch (err) {
    console.error('Order creation error:', err.message);
    res.status(500).json({ error: 'Failed to submit order. Please try again.' });
  }
});

// ── GET /api/orders/:orderId (for clients to check status) ──
router.get('/status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  if (!/^DT-\d{8}-[A-Z0-9]{5}$/.test(orderId)) {
    return res.status(400).json({ error: 'Invalid order ID format' });
  }
  try {
    const result = await db.query(`
      SELECT order_id, service_type, status, created_at
      FROM orders WHERE order_id = $1
    `, [orderId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve order' });
  }
});

module.exports = router;
