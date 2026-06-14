// ── ORDER PAGE JS ─────────────────────────────────
const MIN_INR = 80;
const API_BASE_ORDER = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

// Canonical INR value — always kept in sync
let canonicalINR = 150;

// Active display currency (may differ from INR when country is selected)
let activeCurrency = { code: 'INR', sym: '₹', ratePerINR: 1 };

function inrToLocal(inr) {
  return parseFloat((inr * activeCurrency.ratePerINR).toFixed(2));
}
function localToINR(local) {
  return Math.round(local / activeCurrency.ratePerINR);
}
function minLocal() {
  return parseFloat((MIN_INR * activeCurrency.ratePerINR).toFixed(2));
}

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
  const service  = document.getElementById('serviceType')?.value || '—';
  const hours    = document.getElementById('estimatedHours')?.value || '10-20';
  const { sym, code } = activeCurrency;
  const localRate = inrToLocal(canonicalINR);
  const estINR    = Math.round(hoursToNum(hours) * canonicalINR);
  const estLocal  = parseFloat((hoursToNum(hours) * localRate).toFixed(2));

  document.getElementById('sum-service').textContent = service || '—';
  document.getElementById('sum-hours').textContent   = hours;
  document.getElementById('sum-rate').textContent    = `${sym}${localRate}/${code}`;

  if (estINR > 0) {
    document.getElementById('sum-total').textContent = code === 'INR'
      ? `₹${estINR.toLocaleString()}`
      : `${sym}${estLocal.toLocaleString()} (≈ ₹${estINR.toLocaleString()})`;
  } else {
    document.getElementById('sum-total').textContent = '—';
  }
}

// Country → currency map
const COUNTRY_CURRENCY = {
  'India':     { code: 'INR', sym: '₹' },
  'USA':       { code: 'USD', sym: '$' },
  'UK':        { code: 'GBP', sym: '£' },
  'UAE':       { code: 'AED', sym: 'AED ' },
  'Singapore': { code: 'SGD', sym: 'S$' },
  'Australia': { code: 'AUD', sym: 'A$' },
  'Canada':    { code: 'CAD', sym: 'CA$' },
  'Germany':   { code: 'EUR', sym: '€' },
  'Other':     { code: null,  sym: null }
};

const ALL_CURRENCIES = 'USD,EUR,GBP,AED,SGD,AUD,CAD';
const CURRENCY_SYMS  = { INR:'₹', USD:'$', EUR:'€', GBP:'£', AED:'AED ', SGD:'S$', AUD:'A$', CAD:'CA$' };

// Approximate fallback rates per 1 INR (used when API is unavailable)
const FALLBACK_RATES_PER_INR = {
  USD: 0.012, EUR: 0.011, GBP: 0.0094,
  AED: 0.044, SGD: 0.016, AUD: 0.018, CAD: 0.016, JPY: 1.78
};

// Update input UI to reflect activeCurrency
function updateRateUI() {
  const { code, sym } = activeCurrency;
  const minLoc  = minLocal();
  const dispVal = inrToLocal(canonicalINR);

  const symEl   = document.getElementById('rateCurrencySym');
  const labelEl = document.getElementById('rateLabel');
  const minNote = document.getElementById('rateMinNote');
  const warning = document.getElementById('priceWarning');
  const input   = document.getElementById('hourlyRate');

  if (symEl)   symEl.textContent   = sym;
  if (labelEl) labelEl.textContent = `Rate per hour (in ${sym} ${code}) *`;
  if (minNote) minNote.textContent = `${sym}${minLoc}/hr`;
  if (warning) warning.textContent = `⚠️ Minimum rate is ${sym}${minLoc}/hr`;
  if (input) {
    input.value = dispVal;
    input.min   = minLoc;
    input.step  = activeCurrency.ratePerINR < 0.05 ? '0.01' : activeCurrency.ratePerINR < 1 ? '0.1' : '1';
    input.style.borderColor = '';
    document.getElementById('priceWarning')?.classList.remove('show');
    // Adjust left padding so value never overlaps symbol (AED needs more space than ₹)
    const symLen = sym.trim().length;
    input.style.paddingLeft = symLen <= 1 ? '2rem' : symLen === 2 ? '2.5rem' : symLen === 3 ? '3rem' : '3.75rem';
  }
  updateSummary();
}

// Fetch rate for selected country and switch input currency
async function applyCurrencyForCountry(country) {
  const cur = COUNTRY_CURRENCY[country];
  if (!cur || !cur.code || cur.code === 'INR') {
    activeCurrency = { code: 'INR', sym: '₹', ratePerINR: 1 };
    updateRateUI();
    updateConversions(canonicalINR);
    return;
  }
  const container = document.getElementById('priceConversions');
  if (container) container.innerHTML = '<span class="price-conv-item">Loading...</span>';
  try {
    const res  = await fetch(`${API_BASE_ORDER}/currency?amount=1&from=INR&to=${cur.code}`);
    const data = await res.json();
    activeCurrency = { code: cur.code, sym: cur.sym, ratePerINR: data.rates[cur.code] };
  } catch {
    // API unavailable — use fallback rate so currency still switches
    const fallback = FALLBACK_RATES_PER_INR[cur.code] || 1;
    activeCurrency = { code: cur.code, sym: cur.sym, ratePerINR: fallback };
  }
  updateRateUI();
  updateConversions(canonicalINR);
}

// Show equivalent rates as clickable chips
let convTimer;
async function updateConversions(amountINR) {
  const container = document.getElementById('priceConversions');
  if (!container) return;
  if (isNaN(amountINR) || amountINR < 1) { container.innerHTML = ''; return; }

  const primary = activeCurrency.code;
  const others  = ALL_CURRENCIES.split(',').filter(c => c !== primary);
  const toParam = primary === 'INR' ? ALL_CURRENCIES : ['INR', ...others].join(',');

  let rates = null;
  try {
    const res  = await fetch(`${API_BASE_ORDER}/currency?amount=${amountINR}&from=INR&to=${toParam}`);
    const data = await res.json();
    rates = data.rates;
  } catch {
    // API unavailable — build rates from fallback constants
    rates = {};
    toParam.split(',').forEach(c => {
      if (FALLBACK_RATES_PER_INR[c]) rates[c] = parseFloat((amountINR * FALLBACK_RATES_PER_INR[c]).toFixed(2));
    });
  }

  // Build entries: exclude the currently active currency (already in the input)
  const entries = primary !== 'INR'
    ? [['INR', amountINR], ...Object.entries(rates).filter(([c]) => c !== primary)]
    : Object.entries(rates);

  container.innerHTML = entries
    .map(([cur, val]) => {
      const sym        = CURRENCY_SYMS[cur] || '';
      const ratePerINR = parseFloat(val) / amountINR;
      return `<span class="price-conv-item" data-code="${cur}" data-sym="${sym.trim()}" data-rate="${ratePerINR}" title="Click to switch to ${cur}">${sym}${parseFloat(val).toFixed(2)} ${cur}</span>`;
    })
    .join('');

  // Clicking a chip switches the input to that currency
  container.querySelectorAll('.price-conv-item').forEach(chip => {
    chip.addEventListener('click', () => {
      const code       = chip.dataset.code;
      const ratePerINR = parseFloat(chip.dataset.rate);
      activeCurrency   = { code, sym: CURRENCY_SYMS[code] || chip.dataset.sym, ratePerINR };
      updateRateUI();
      updateConversions(canonicalINR);
    });
  });
}

// Rate input validation + conversion
function initRateInput() {
  const rateInput = document.getElementById('hourlyRate');
  const warning   = document.getElementById('priceWarning');
  if (!rateInput) return;

  rateInput.addEventListener('input', () => {
    const localVal = parseFloat(rateInput.value);
    const minLoc   = minLocal();
    if (!isNaN(localVal)) canonicalINR = localToINR(localVal);

    if (!isNaN(localVal) && localVal < minLoc && rateInput.value !== '') {
      warning.classList.add('show');
      rateInput.style.borderColor = 'var(--red)';
    } else {
      warning.classList.remove('show');
      rateInput.style.borderColor = '';
    }
    clearTimeout(convTimer);
    convTimer = setTimeout(() => {
      updateConversions(canonicalINR);
      updateSummary();
    }, 500);
  });

  rateInput.addEventListener('blur', () => {
    const localVal = parseFloat(rateInput.value);
    const minLoc   = minLocal();
    if (isNaN(localVal) || localVal < minLoc) {
      canonicalINR        = MIN_INR;
      rateInput.value     = inrToLocal(MIN_INR);
      warning.classList.remove('show');
      rateInput.style.borderColor = '';
      updateConversions(canonicalINR);
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

  // When country changes, switch input currency
  document.getElementById('clientCountry')?.addEventListener('change', () => {
    applyCurrencyForCountry(document.getElementById('clientCountry').value);
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
    const rate = canonicalINR;

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
    if (isNaN(rate) || rate < MIN_INR) {
      status.textContent = `❌ Minimum rate is ₹${MIN_INR}/hr`;
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
  updateConversions(canonicalINR);
  updateSummary();
  document.getElementById('navbar')?.classList.add('scrolled');
});
