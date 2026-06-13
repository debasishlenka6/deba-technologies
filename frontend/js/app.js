// ── CONFIG ──────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

const MIN_RATE_INR = 80;
const DEFAULT_RATE_INR = 150;

// ── SERVICES DATA ────────────────────────────────
const SERVICES = [
  {
    id: 1, icon: "🖥️",
    name: "IT Support & Helpdesk",
    desc: "Remote desktop support, troubleshooting hardware/software issues, user account management, and technical assistance for individuals and businesses.",
    tags: ["Remote Support", "Windows", "Mac", "Troubleshooting"],
    rate: "From ₹80/hr"
  },
  {
    id: 2, icon: "🌐",
    name: "Network Infrastructure Setup",
    desc: "Design, configure, and deploy enterprise network infrastructure including LAN/WAN, VLANs, routing protocols (OSPF, EIGRP), and wireless networks.",
    tags: ["Cisco", "Meraki MX75", "UniFi", "VLAN", "OSPF"],
    rate: "From ₹80/hr"
  },
  {
    id: 3, icon: "☁️",
    name: "Microsoft 365 Administration",
    desc: "Full M365 tenant management including user provisioning, Exchange Online, Teams administration, SharePoint, Intune device management, and Azure AD.",
    tags: ["Exchange", "Teams", "Intune", "Azure AD", "SharePoint"],
    rate: "From ₹80/hr"
  },
  {
    id: 4, icon: "🛡️",
    name: "Cybersecurity & Monitoring",
    desc: "Security assessments, firewall configuration, SIEM setup, threat detection, DLP implementation, and ongoing security monitoring using Fortinet and ManageEngine.",
    tags: ["Fortinet", "SIEM", "DLP", "Threat Detection", "NSE"],
    rate: "From ₹80/hr"
  },
  {
    id: 5, icon: "🐳",
    name: "DevOps & Deployment",
    desc: "Set up CI/CD pipelines, containerize applications with Docker, deploy on Kubernetes, configure GitHub Actions, and implement infrastructure monitoring.",
    tags: ["Docker", "Kubernetes", "GitHub Actions", "CI/CD"],
    rate: "From ₹80/hr"
  },
  {
    id: 6, icon: "🖧",
    name: "System Administration",
    desc: "Windows Server configuration, Active Directory setup, Group Policy management, patch management, backup strategies, and server performance tuning.",
    tags: ["Windows Server", "Active Directory", "GPO", "Backup"],
    rate: "From ₹80/hr"
  },
  {
    id: 7, icon: "📊",
    name: "ManageEngine & DLP",
    desc: "Deploy and configure ManageEngine solutions for IT asset management, service desk, DLP policies, and endpoint management across your organization.",
    tags: ["ManageEngine", "DLP", "Asset Management", "ITSM"],
    rate: "From ₹80/hr"
  },
  {
    id: 8, icon: "🔧",
    name: "Technical Consulting",
    desc: "Architecture reviews, technology roadmap planning, vendor evaluation, IT strategy consulting, and one-on-one technical advisory sessions.",
    tags: ["Strategy", "Architecture", "Advisory", "Planning"],
    rate: "From ₹80/hr"
  }
];

// ── CURRENCY ─────────────────────────────────────
let exchangeRates = null;
let ratesFetchTime = null;

async function fetchRates(baseAmountINR) {
  try {
    // Frankfurter API — completely free, no key needed
    const url = `https://api.frankfurter.app/latest?amount=${baseAmountINR}&from=INR&to=USD,EUR,GBP,AED,SGD,AUD,CAD,JPY`;
    const res = await fetch(url);
    const data = await res.json();
    exchangeRates = data.rates;
    ratesFetchTime = Date.now();
    return data.rates;
  } catch (err) {
    console.warn('Currency fetch failed, using fallback rates');
    // Fallback approximate rates per 1 INR
    const perINR = { USD:0.012, EUR:0.011, GBP:0.0094, AED:0.044, SGD:0.016, AUD:0.018, CAD:0.016, JPY:1.8 };
    const result = {};
    for (const [cur, rate] of Object.entries(perINR)) {
      result[cur] = (baseAmountINR * rate).toFixed(2);
    }
    return result;
  }
}

const CURRENCY_SYMBOLS = { USD:'$', EUR:'€', GBP:'£', AED:'AED ', SGD:'S$', AUD:'A$', CAD:'C$', JPY:'¥' };
const CURRENCY_NAMES = { USD:'US Dollar', EUR:'Euro', GBP:'British Pound', AED:'UAE Dirham', SGD:'Singapore $', AUD:'Australian $', CAD:'Canadian $', JPY:'Japanese Yen' };

// ── RENDER SERVICES ───────────────────────────────
function renderServices() {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;
  grid.innerHTML = SERVICES.map(s => `
    <div class="service-card" onclick="window.location='pages/order.html?service=${s.id}'">
      <div class="service-icon">${s.icon}</div>
      <div class="service-name">${s.name}</div>
      <div class="service-desc">${s.desc}</div>
      <div class="service-tags">${s.tags.map(t => `<span class="service-tag">${t}</span>`).join('')}</div>
      <div class="service-rate">${s.rate} → <a href="pages/order.html?service=${s.id}" style="color:var(--accent)">Order Now →</a></div>
    </div>
  `).join('');
}

// ── RENDER CURRENCY GRID ──────────────────────────
async function renderCurrencyGrid(amountINR) {
  const grid = document.getElementById('currencyGrid');
  if (!grid) return;
  grid.innerHTML = Object.entries(CURRENCY_NAMES).map(([code]) => `
    <div class="currency-item">
      <span class="currency-name">${code} — ${CURRENCY_NAMES[code]}</span>
      <span class="currency-value loading" id="curr-${code}">Loading...</span>
    </div>
  `).join('');
  const rates = await fetchRates(amountINR);
  for (const [code, val] of Object.entries(rates)) {
    const el = document.getElementById(`curr-${code}`);
    if (el) {
      el.textContent = `${CURRENCY_SYMBOLS[code] || ''}${parseFloat(val).toFixed(2)}`;
      el.classList.remove('loading');
    }
  }
}

// ── PRICE SLIDER ──────────────────────────────────
function initPriceSlider() {
  const slider = document.getElementById('priceSlider');
  const valDisplay = document.getElementById('sliderValue');
  const heroPrice = document.getElementById('heroPrice');
  const heroPriceUsd = document.getElementById('heroPriceUsd');
  if (!slider) return;

  let debounceTimer;
  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    valDisplay.textContent = `₹${val}/hr`;
    heroPrice.textContent = `₹${val}/hr`;

    // Update slider gradient
    const pct = ((val - 80) / (500 - 80)) * 100;
    slider.style.background = `linear-gradient(to right, var(--accent2) 0%, var(--accent2) ${pct}%, var(--border2) ${pct}%, var(--border2) 100%)`;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const rates = await fetchRates(val);
      if (rates.USD && heroPriceUsd) {
        heroPriceUsd.textContent = `≈ $${parseFloat(rates.USD).toFixed(2)}/hr`;
      }
      renderCurrencyGrid(val);
    }, 400);
  });
}

// ── CONTACT FORM ──────────────────────────────────
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('contactBtn');
    const status = document.getElementById('contactStatus');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('contactName').value.trim(),
          email: document.getElementById('contactEmail').value.trim(),
          message: document.getElementById('contactMessage').value.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        status.textContent = '✅ Message sent! I will reply within 24 hours.';
        status.className = 'form-status success';
        form.reset();
      } else {
        throw new Error(data.error || 'Something went wrong');
      }
    } catch (err) {
      status.textContent = `❌ ${err.message}. Please use the contact form to reach me.`;
      status.className = 'form-status error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Message →';
    }
  });
}

// ── NAVBAR SCROLL ─────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
  if (toggle) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
}

// ── INIT ──────────────────────────────────────────
async function init() {
  initNavbar();
  renderServices();
  initPriceSlider();
  initContactForm();

  // Initial currency load
  await renderCurrencyGrid(DEFAULT_RATE_INR);

  // Update hero price USD
  const rates = await fetchRates(MIN_RATE_INR);
  const heroPriceUsd = document.getElementById('heroPriceUsd');
  if (heroPriceUsd && rates.USD) {
    heroPriceUsd.textContent = `≈ $${parseFloat(rates.USD).toFixed(2)}/hr`;
  }
}

document.addEventListener('DOMContentLoaded', init);
