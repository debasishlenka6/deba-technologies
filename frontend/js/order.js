// ── ORDER PAGE JS ─────────────────────────────────
const MIN_RATE = 80;
const API_BASE_ORDER = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

// Pre-select service from URL param
function preselectService() {
  const params = new URLSearchParams(window.location.search);
  const serviceId = params.get('service');
  if (!serviceId) return;
  const serviceNames = {
    1: "IT Support & Helpdesk",
    2: "Network Infrastructure Setup",
    3: "Microsoft 365 Administration",
    4: "Cybersecurity & Monitoring",
    5: "DevOps & Deployment",
    6: "System Administration",
    7: "ManageEngine & DLP",
    8: "Technical Consulting"
  };
  const sel = document.getElementById('serviceType');
  if (sel && serviceNames[serviceId]) {
    sel.value = serviceNames[serviceId];
    updateSummary();
  }
}

// Set min date to tomorrow
function setMinDate() {
  const dateInput = document.getElementById('startDate');
  if (!dateInput) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = tomorrow.toISOString().split('T')[0];
  dateInput.value = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
}

// Character count for description
function initDescCount() {
  const desc = document.getElementById('projectDesc');
  const count = document.getElementById('descCount');
  if (!desc || !count) return;
  desc.addEventListener('input', () => {
    count.textContent = `${desc.value.length} / 2000 characters`;
    count.style.color = desc.value.length > 1800 ? 'var(--orange)' : 'var(--muted)';
  });
}

// Estimate hours midpoint
function hoursToNum(val) {
  const map = { '1-5': 3, '5-10': 7.5, '10-20': 15, '20-40': 30, '40+': 50 };
  return map[val] || 15;
}

// Update order summary
function updateSummary() {
  const service = document.getElementById('serviceType')?.value || '—';
  const hours = document.getElementById('estimatedHours')?.value || '10-20';
  const rate = parseInt(document.getElementById('hourlyRate')?.value) || 150;

  document.getElementById('sum-service').textContent = service || '—';
  document.getElementById('sum-hours').textContent = hours;
  document.getElementById('sum-rate').textContent = `₹${rate}/hr`;

  const est = Math.round(hoursToNum(hours) * rate);
  document.getElementById('sum-total').textContent = est > 0 ? `₹${est.toLocaleString()}` : '—';
}

// Currency conversion for rate input
let convTimer;
async function updateConversions(amountINR) {
  const container = document.getElementById('priceConversions');
  if (!container) return;
  if (isNaN(amountINR) || amountINR < 1) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = '<span class="price-conv-item">Loading...</span>';
  try {
    const url = `https://api.frankfurter.app/latest?amount=${amountINR}&from=INR&to=USD,EUR,GBP,AED`;
    const res = await fetch(url);
    const data = await res.json();
    const syms = { USD:'$', EUR:'€', GBP:'£', AED:'AED ' };
    container.innerHTML = Object.entries(data.rates)
      .map(([cur, val]) => `<span class="price-conv-item">${syms[cur]}${parseFloat(val).toFixed(2)} ${cur}</span>`)
      .join('');
  } catch {
    container.innerHTML = '<span class="price-conv-item" style="color:var(--muted)">Conversion unavailable</span>';
  }
}

// Rate input validation + conversion
function initRateInput() {
  const rateInput = document.getElementById('hourlyRate');
  const warning = document.getElementById('priceWarning');
  if (!rateInput) return;

  rateInput.addEventListener('input', () => {
    const val = parseInt(rateInput.value);
    if (val < MIN_RATE && rateInput.value !== '') {
      warning.classList.add('show');
      rateInput.style.borderColor = 'var(--red)';
    } else {
      warning.classList.remove('show');
      rateInput.style.borderColor = '';
    }
    clearTimeout(convTimer);
    convTimer = setTimeout(() => {
      updateConversions(val);
      updateSummary();
    }, 500);
  });

  rateInput.addEventListener('blur', () => {
    const val = parseInt(rateInput.value);
    if (isNaN(val) || val < MIN_RATE) {
      rateInput.value = MIN_RATE;
      warning.classList.remove('show');
      rateInput.style.borderColor = '';
      updateConversions(MIN_RATE);
      updateSummary();
    }
  });
}

// Validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Submit order
function initOrderForm() {
  const form = document.getElementById('orderForm');
  if (!form) return;

  // Live summary updates
  ['serviceType','estimatedHours','hourlyRate'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateSummary);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const status = document.getElementById('orderStatus');

    // Validate
    const name = document.getElementById('clientName').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const country = document.getElementById('clientCountry').value;
    const service = document.getElementById('serviceType').value;
    const desc = document.getElementById('projectDesc').value.trim();
    const rate = parseInt(document.getElementById('hourlyRate').value);

    if (!name || name.length < 2) {
      status.textContent = '❌ Please enter your full name';
      status.className = 'form-status error';
      return;
    }
    if (!isValidEmail(email)) {
      status.textContent = '❌ Please enter a valid email address';
      status.className = 'form-status error';
      return;
    }
    if (!country) {
      status.textContent = '❌ Please select your country';
      status.className = 'form-status error';
      return;
    }
    if (!service) {
      status.textContent = '❌ Please select a service';
      status.className = 'form-status error';
      return;
    }
    if (desc.length < 30) {
      status.textContent = '❌ Please describe your project in at least 30 characters';
      status.className = 'form-status error';
      return;
    }
    if (isNaN(rate) || rate < MIN_RATE) {
      status.textContent = `❌ Minimum rate is ₹${MIN_RATE}/hr`;
      status.className = 'form-status error';
      return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';
    status.textContent = '';
    status.className = 'form-status';

    try {
      const payload = {
        client_name: name,
        client_email: email,
        client_company: document.getElementById('clientCompany').value.trim() || null,
        client_country: country,
        service_type: service,
        project_description: desc,
        estimated_hours: document.getElementById('estimatedHours').value,
        preferred_start_date: document.getElementById('startDate').value || null,
        hourly_rate_inr: rate,
        referral_source: document.getElementById('referralSource').value,
        additional_notes: document.getElementById('additionalNotes').value.trim() || null
      };

      const res = await fetch(`${API_BASE_ORDER}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        form.reset();
        document.getElementById('orderSummary').style.display = 'none';
        btn.style.display = 'none';
        status.innerHTML = `
          <div style="background:rgba(0,200,150,.1);border:1px solid var(--accent2);border-radius:12px;padding:2rem;text-align:center">
            <div style="font-size:2.5rem;margin-bottom:.75rem">🎉</div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--accent2);margin-bottom:.5rem">Order Received! Reference: ${data.order_id}</div>
            <div style="color:var(--muted);font-size:.9rem">I'll review your requirements and send a detailed proposal to <strong>${email}</strong> within 24 hours.</div>
            <a href="../index.html" style="display:inline-block;margin-top:1.25rem;color:var(--accent)">← Back to Home</a>
          </div>
        `;
        status.className = 'form-status';
      } else {
        throw new Error(data.error || 'Order submission failed');
      }
    } catch (err) {
      status.textContent = `❌ ${err.message}. Please try again or use the contact form.`;
      status.className = 'form-status error';
      btn.disabled = false;
      btn.textContent = '🚀 Submit Order Request';
    }
  });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  preselectService();
  setMinDate();
  initDescCount();
  initRateInput();
  initOrderForm();
  updateConversions(150);
  updateSummary();
  document.getElementById('navbar')?.classList.add('scrolled');
});
