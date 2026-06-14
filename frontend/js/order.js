// ── ORDER PAGE JS ─────────────────────────────────
const API_BASE_ORDER = ['localhost','127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000/api'
  : '/api';

const CURRENCY_SYMS    = { INR:'₹', USD:'$', EUR:'€', GBP:'£', AED:'AED ', SGD:'S$', AUD:'A$', CAD:'CA$' };
const CURRENCY_MIN     = { INR:80, USD:1, GBP:1, EUR:1, AED:4, SGD:2, AUD:2, CAD:2 };
const CURRENCY_DEFAULT = { INR:150, USD:2, GBP:2, EUR:2, AED:8, SGD:3, AUD:3, CAD:3 };
// Approximate INR equivalent per 1 unit — used only to compute hourly_rate_inr for backend storage
const APPROX_INR       = { INR:1, USD:83, GBP:105, EUR:90, AED:22.6, SGD:62, AUD:54, CAD:61 };

function getSelectedCurrency() {
  return document.getElementById('rateCurrency')?.value || 'INR';
}
function getRate() {
  return parseFloat(document.getElementById('hourlyRate')?.value) || 0;
}
function sym(code) { return CURRENCY_SYMS[code] || (code + ' '); }

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

// Set min date to tomorrow, default to 7 days out
function setMinDate() {
  const dateInput = document.getElementById('startDate');
  if (!dateInput) return;
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekOut = new Date();
  weekOut.setDate(weekOut.getDate() + 7);
  dateInput.min   = fmt(tomorrow);
  dateInput.value = fmt(weekOut);
}

// Character count for description
function initDescCount() {
  const desc  = document.getElementById('projectDesc');
  const count = document.getElementById('descCount');
  if (!desc || !count) return;
  desc.addEventListener('input', () => {
    count.textContent = `${desc.value.length} / 2000 characters`;
    count.style.color = desc.value.length > 1800 ? 'var(--orange)' : 'var(--muted)';
  });
}

// Hours midpoint for summary estimate
function hoursToNum(val) {
  const map = { '1-5':3, '5-10':7.5, '10-20':15, '20-40':30, '40+':50 };
  return map[val] || 15;
}

// Update order summary panel
function updateSummary() {
  const service  = document.getElementById('serviceType')?.value || '—';
  const hours    = document.getElementById('estimatedHours')?.value || '10-20';
  const currency = getSelectedCurrency();
  const rate     = getRate();
  const s        = sym(currency);

  document.getElementById('sum-service').textContent = service || '—';
  document.getElementById('sum-hours').textContent   = hours;
  document.getElementById('sum-rate').textContent    = rate > 0 ? `${s}${rate}/${currency}` : '—';

  const est = rate > 0 ? (rate * hoursToNum(hours)).toFixed(2) : null;
  document.getElementById('sum-total').textContent   = est ? `${s}${parseFloat(est).toLocaleString()}` : '—';
}

// When currency dropdown changes — update min label + reset input to sensible default
function onCurrencyChange() {
  const currency = getSelectedCurrency();
  const minVal   = CURRENCY_MIN[currency] || 1;
  const defVal   = CURRENCY_DEFAULT[currency] || minVal;
  const s        = sym(currency);

  const minNote = document.getElementById('rateMinNote');
  const input   = document.getElementById('hourlyRate');
  const warning = document.getElementById('priceWarning');

  if (minNote) minNote.textContent = `Minimum ${s}${minVal}/hr`;
  if (input) {
    input.min   = minVal;
    input.value = defVal;
    input.style.borderColor = '';
    warning?.classList.remove('show');
  }
  updateSummary();
}

// Rate input validation
function initRateInput() {
  const rateInput   = document.getElementById('hourlyRate');
  const currencySel = document.getElementById('rateCurrency');
  const warning     = document.getElementById('priceWarning');
  if (!rateInput) return;

  rateInput.addEventListener('input', () => {
    const val      = parseFloat(rateInput.value);
    const currency = getSelectedCurrency();
    const minVal   = CURRENCY_MIN[currency] || 1;

    if (!isNaN(val) && val < minVal && rateInput.value !== '') {
      if (warning) {
        warning.textContent = `⚠️ Minimum rate is ${sym(currency)}${minVal}/hr`;
        warning.classList.add('show');
      }
      rateInput.style.borderColor = 'var(--red)';
    } else {
      warning?.classList.remove('show');
      rateInput.style.borderColor = '';
    }
    updateSummary();
  });

  rateInput.addEventListener('blur', () => {
    const val      = parseFloat(rateInput.value);
    const currency = getSelectedCurrency();
    const minVal   = CURRENCY_MIN[currency] || 1;
    if (isNaN(val) || val < minVal) {
      rateInput.value = CURRENCY_DEFAULT[currency] || minVal;
      warning?.classList.remove('show');
      rateInput.style.borderColor = '';
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

  // Every field that affects the summary panel
  ['serviceType', 'estimatedHours', 'rateCurrency'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (id === 'rateCurrency') onCurrencyChange();
      else updateSummary();
    });
  });
  const rateEl = document.getElementById('hourlyRate');
  rateEl?.addEventListener('input',  updateSummary);
  rateEl?.addEventListener('change', updateSummary);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn    = document.getElementById('submitBtn');
    const status = document.getElementById('orderStatus');

    const name     = document.getElementById('clientName').value.trim();
    const email    = document.getElementById('clientEmail').value.trim();
    const country  = document.getElementById('clientCountry').value;
    const service  = document.getElementById('serviceType').value;
    const desc     = document.getElementById('projectDesc').value.trim();
    const currency = getSelectedCurrency();
    const rate     = getRate();
    const minVal   = CURRENCY_MIN[currency] || 1;

    if (!name || name.length < 2) {
      status.textContent = '❌ Please enter your full name';
      status.className = 'form-status error'; return;
    }
    if (!isValidEmail(email)) {
      status.textContent = '❌ Please enter a valid email address';
      status.className = 'form-status error'; return;
    }
    if (!country) {
      status.textContent = '❌ Please select your country';
      status.className = 'form-status error'; return;
    }
    if (!service) {
      status.textContent = '❌ Please select a service';
      status.className = 'form-status error'; return;
    }
    if (desc.length < 30) {
      status.textContent = '❌ Please describe your project in at least 30 characters';
      status.className = 'form-status error'; return;
    }
    if (isNaN(rate) || rate < minVal) {
      status.textContent = `❌ Minimum rate is ${sym(currency)}${minVal}/hr`;
      status.className = 'form-status error'; return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';
    status.textContent = '';
    status.className = 'form-status';

    // Approximate INR for backend (satisfies the >= 80 DB constraint)
    const hourly_rate_inr = Math.max(80, Math.round(rate * (APPROX_INR[currency] || 1)));

    try {
      const payload = {
        client_name:         name,
        client_email:        email,
        client_company:      document.getElementById('clientCompany').value.trim() || null,
        client_country:      country,
        service_type:        service,
        project_description: desc,
        estimated_hours:     document.getElementById('estimatedHours').value,
        preferred_start_date: document.getElementById('startDate').value || null,
        hourly_rate_inr,
        currency,
        hourly_rate:         rate,
        referral_source:     document.getElementById('referralSource').value,
        additional_notes:    document.getElementById('additionalNotes').value.trim() || null
      };

      const res  = await fetch(`${API_BASE_ORDER}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Backend server is not running. Please start it with: cd backend && npm start');
      }
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
      const isNetworkErr = err instanceof TypeError && err.message.includes('fetch');
      const msg = isNetworkErr
        ? 'Cannot reach the server. Make sure the backend is running (cd backend && npm start).'
        : err.message;
      status.textContent = `❌ ${msg}`;
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
  updateSummary();
  document.getElementById('navbar')?.classList.add('scrolled');
});
