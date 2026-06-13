# ⚡ Deba Technologies

[![Build](https://github.com/debasishlenka6/deba-technologies/actions/workflows/deploy.yml/badge.svg)](https://github.com/debasishlenka6/deba-technologies/actions)
[![Docker](https://img.shields.io/badge/Docker-Hub-2496ED)](https://hub.docker.com/r/debasishlenka6/deba-api)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

IT Support & Network Services platform. Built with Node.js, PostgreSQL, Docker, and Kubernetes.

## 🚀 Quick Start (Local)

```bash
# 1. Clone
git clone https://github.com/debasishlenka6/deba-technologies.git
cd deba-technologies

# 2. Set up environment
cp .env.example .env
# Edit .env with your DB_PASSWORD

# 3. Start everything
docker compose up --build

# 4. Open browser
# Frontend: http://localhost:8080
# API:      http://localhost:8080/api/health
```

## 📁 Project Structure

```
deba-technologies/
├── frontend/         HTML/CSS/JS — company website
├── backend/          Node.js Express API
│   ├── src/
│   │   ├── routes/   orders, contact, services
│   │   ├── db/       PostgreSQL connection + SQL schema
│   │   └── middleware/ email notifications
│   └── tests/        Jest + Supertest API tests
├── nginx/            Reverse proxy config
├── k8s/              Kubernetes manifests
└── docker-compose.yml
```

## 🔑 Minimum Rate: ₹80/hr

The platform enforces a minimum hourly rate of ₹80 at 3 levels:
- Frontend: blur validation on rate input
- API: express-validator + manual check
- Database: CHECK constraint `hourly_rate_inr >= 80`

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js 18, Express.js |
| Database | PostgreSQL 15 |
| Currency | Frankfurter API (free, no key) |
| Email | Nodemailer + Gmail SMTP (free) |
| Container | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages (frontend) |

## 🌍 Currency Conversion

Uses [Frankfurter API](https://frankfurter.app/) — completely free, no API key needed.
Converts ₹/hr to USD, EUR, GBP, AED, SGD, AUD, CAD, JPY in real time.
