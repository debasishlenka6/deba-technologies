const nodemailer = require('nodemailer');

// Create transporter — uses Gmail SMTP (free)
// Requires a Gmail App Password (NOT your real Gmail password)
// How to get App Password: Gmail → Settings → Security → 2FA → App passwords
function createTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null; // Email disabled — no credentials set
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── NOTIFY: New Order ─────────────────────────────
async function notifyNewOrder(order) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('📧 Email disabled (no credentials). Order logged to console.');
    console.log(`   Order: ${order.orderId} | ${order.service_type} | ₹${order.hourly_rate_inr}/hr`);
    return;
  }

  const notifyTo = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER;

  // Email to admin (you)
  await transporter.sendMail({
    from: `"Deba Technologies" <${process.env.GMAIL_USER}>`,
    to: notifyTo,
    subject: `🚀 New Order: ${order.service_type} — ${order.orderId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0D1117;color:#E6EDF3;padding:2rem;border-radius:12px">
        <h2 style="color:#2D9CDB;margin-bottom:1rem">⚡ New Order Received</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#8B949E;padding:.5rem 0">Order ID</td><td style="font-weight:700;color:#00C896">${order.orderId}</td></tr>
          <tr><td style="color:#8B949E;padding:.5rem 0">Client</td><td>${order.client_name}</td></tr>
          <tr><td style="color:#8B949E;padding:.5rem 0">Email</td><td>${order.client_email}</td></tr>
          <tr><td style="color:#8B949E;padding:.5rem 0">Country</td><td>${order.client_country}</td></tr>
          ${order.client_company ? `<tr><td style="color:#8B949E;padding:.5rem 0">Company</td><td>${order.client_company}</td></tr>` : ''}
          <tr><td style="color:#8B949E;padding:.5rem 0">Service</td><td style="font-weight:700">${order.service_type}</td></tr>
          <tr><td style="color:#8B949E;padding:.5rem 0">Hours</td><td>${order.estimated_hours}</td></tr>
          <tr><td style="color:#8B949E;padding:.5rem 0">Rate</td><td style="font-weight:700;color:#F59E0B">₹${order.hourly_rate_inr}/hr</td></tr>
        </table>
        <div style="margin-top:1.5rem;padding:1rem;background:#161B22;border-radius:8px;border-left:4px solid #2D9CDB">
          <p style="color:#8B949E;margin-bottom:.5rem;font-size:.85rem">Project Description</p>
          <p>${order.project_description}</p>
        </div>
        <p style="margin-top:1.5rem;color:#8B949E;font-size:.85rem">Received at ${new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})} IST</p>
      </div>
    `,
  });

  // Confirmation email to client
  await transporter.sendMail({
    from: `"Debasish Lenka — Deba Technologies" <${process.env.GMAIL_USER}>`,
    to: order.client_email,
    subject: `✅ Order Received — ${order.orderId} | Deba Technologies`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0D1117;color:#E6EDF3;padding:2rem;border-radius:12px">
        <h2 style="color:#00C896">✅ Your order has been received!</h2>
        <p>Hi ${order.client_name},</p>
        <p>Thank you for reaching out to Deba Technologies. I've received your request and will review it shortly.</p>
        <div style="background:#161B22;border-radius:8px;padding:1.25rem;margin:1.5rem 0;border:1px solid #21262D">
          <p style="margin:0;color:#8B949E;font-size:.85rem">Order Reference</p>
          <p style="margin:.25rem 0 0;font-size:1.5rem;font-weight:700;color:#00C896;font-family:monospace">${order.orderId}</p>
        </div>
        <p><strong>Service requested:</strong> ${order.service_type}</p>
        <p><strong>Your rate:</strong> ₹${order.hourly_rate_inr}/hr</p>
        <p style="color:#8B949E">⏰ I typically respond within 24 hours with a detailed proposal and timeline.</p>
        <p style="color:#8B949E">If you have any immediate questions, reply to this email directly.</p>
        <hr style="border-color:#21262D;margin:1.5rem 0"/>
        <p style="color:#8B949E;font-size:.85rem">Debasish Lenka<br/>Systems & Network Engineer<br/>Deba Technologies</p>
      </div>
    `,
  });
}

// ── NOTIFY: Contact Message ───────────────────────
async function notifyContact(contact) {
  const transporter = createTransporter();
  if (!transporter) return;

  const notifyTo = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER;

  await transporter.sendMail({
    from: `"Deba Technologies" <${process.env.GMAIL_USER}>`,
    to: notifyTo,
    subject: `💬 New Contact: ${contact.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;background:#0D1117;color:#E6EDF3;padding:2rem;border-radius:12px">
        <h2 style="color:#2D9CDB">New Contact Message</h2>
        <p><strong>From:</strong> ${contact.name} (${contact.email})</p>
        <div style="background:#161B22;padding:1rem;border-radius:8px;border-left:4px solid #2D9CDB;margin-top:1rem">
          <p>${contact.message}</p>
        </div>
      </div>
    `,
  });
}

module.exports = { notifyNewOrder, notifyContact };
