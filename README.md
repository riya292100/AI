# LifeOS — AI-Powered Personal Life Assistant

[![CI](https://github.com/riya292100/AI/actions/workflows/ci.yml/badge.svg)](https://github.com/riya292100/AI/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688.svg)](https://fastapi.tiangolo.com/)

**LifeOS** is a modern, privacy-first personal life management platform and executive assistant. Built with a modular **FastAPI** backend and a responsive **React / Tailwind CSS** frontend, LifeOS organizes your productivity, finances, schedules, health habits, shopping checklists, and document locker.

---

## 🌟 Key Features

- **📊 Central Intelligence Dashboard**: Consolidated overview of daily KPIs, urgent items, upcoming commitments, and instant AI daily planning.
- **🤖 AI Life Assistant**: Real-time streaming conversational assistant (Claude Sonnet 4.6 / LLM) grounded in your personal tasks, bills, and schedule.
- **✅ Task & Goal Management**: Priority queues, category segmentation, due dates, and completion status.
- **💳 Financial Tracker & Budgets**: Track upcoming bills with deadline alerts, log categorized expenses, and monitor monthly budget caps with threshold warnings (80% / 100%).
- **📄 Smart Document Locker & OCR**: Secure repository for critical personal documents (IDs, insurance cards, warranties) with automated OCR expiry date parsing.
- **📅 Schedule & Calendar**: Interactive calendar view with 24-hour proactive alerts.
- **🎯 Habits & Daily Routines**: Daily consistency tracking, streak calculations, and completion logs.
- **🛒 Shopping Lists**: Dynamic checklist for household and grocery items.
- **🔔 Proactive Notifications**: Centralized reminder engine alerting you on overdue bills, expiring documents, approaching appointments, and budget caps.
- **🔒 Authentication & Data Isolation**: JWT-based session tokens in HttpOnly cookies, bcrypt password hashing, brute-force rate-limiting, and complete tenant isolation.

---

## 🏗️ Architecture & Tech Stack

```
LifeOS/
├── .github/
│   ├── workflows/ci.yml      # GitHub Actions CI pipeline (backend + frontend)
│   └── dependabot.yml        # Automated weekly dependency management
├── .devcontainer/            # Standardized development container config
├── backend/
│   ├── routers/              # Modular domain API routers
│   │   ├── auth.py           # Registration, login, profile endpoints
│   │   ├── tasks.py          # Tasks CRUD endpoints
│   │   ├── bills.py          # Bills CRUD & payment tracking
│   │   ├── expenses.py       # Expense logging & categorization
│   │   ├── documents.py      # Document locker & OCR extraction
│   │   ├── appointments.py   # Calendar appointments
│   │   ├── habits.py         # Habit logging & streaks
│   │   ├── shopping.py       # Shopping list items
│   │   ├── budgets.py        # Monthly budget caps & calculations
│   │   ├── reminders.py      # Proactive computed alerts & dismissal
│   │   ├── dashboard.py      # KPI metrics & global search
│   │   ├── ai.py             # Streaming chat & daily planner
│   │   └── health.py         # Health checks
│   ├── tests/                # 100% self-contained in-memory test suite
│   │   ├── conftest.py       # Pytest fixtures (mongomock, TestClient, test user)
│   │   └── backend_test.py   # Full API regression suite
│   ├── auth.py               # Password hashing, JWT token creation, auth dependency
│   ├── config.py             # Environment settings & CORS
│   ├── database.py           # MongoDB async client & helpers
│   ├── logger.py             # Structured JSON logger
│   ├── models.py             # Typed Pydantic v2 schemas
│   ├── seed.py               # Demo database populator
│   ├── server.py             # Streamlined FastAPI application entry point
│   ├── Dockerfile            # Python backend container
│   └── requirements.txt      # Pinned backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components & ErrorBoundary
│   │   ├── contexts/         # Authentication & Global state
│   │   ├── lib/              # API client & utility helpers
│   │   ├── pages/            # Application views (Dashboard, Money, Tasks, etc.)
│   │   └── App.js            # App routing & providers
│   ├── Dockerfile            # Production multi-stage Nginx build
│   ├── nginx.conf            # SPA routing & reverse proxy
│   ├── eslint.config.mjs     # ESLint 9 flat configuration
│   ├── package.json          # Node dependencies & scripts
│   └── tailwind.config.js    # Tailwind CSS design system
├── docker-compose.yml        # One-command full-stack container orchestrator
├── CHANGELOG.md              # Semantic release notes
├── CONTRIBUTING.md           # Engineering guidelines
└── README.md                 # Project documentation
```

---

## 🚀 Quick Start with Docker (Recommended)

Start the entire application stack (MongoDB + FastAPI + React) in a single command:

```bash
docker compose up --build
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

**Default Demo Credentials**:
- **Email**: `demo@lifeos.app`
- **Password**: `lifeos123`

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Python** 3.10+
- **Node.js** 18+ & **Yarn** / **npm**
- **MongoDB** running on `localhost:27017` (or MongoDB Atlas URI)

### 2. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install pinned dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Start FastAPI server
uvicorn backend.server:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
yarn install || npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env

# Start development server
yarn start || npm start
```

---

## 🧪 Running Tests

### Backend Automated Test Suite
Backend tests run in-memory using `mongomock-motor` without requiring external databases or running servers:
```bash
cd backend
pytest -v
```

### Frontend Test Suite
Frontend unit & component tests run using React 19 testing tools:
```bash
cd frontend
npm test -- --watchAll=false
```

### Frontend Lint & Type Checks
```bash
cd frontend
# Check linting
npm run lint
# Auto-fix issues
npm run lint:fix
# Format code
npm run format
```

---

## ⚙️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MONGO_URL` | MongoDB connection URI | `mongodb://localhost:27017` |
| `DB_NAME` | MongoDB database name | `lifeos_db` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `lifeos_dev_secret_key` |
| `EMERGENT_LLM_KEY` | Emergent / Claude API key for AI & OCR | `""` |
| `ADMIN_EMAIL` | Default demo user email | `demo@lifeos.app` |
| `ADMIN_PASSWORD` | Default demo user password | `lifeos123` |
| `FRONTEND_URL` | Allowed origin for frontend app | `http://localhost:3000` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated or `*`) | `*` |
| `REACT_APP_BACKEND_URL`| Frontend API endpoint | `http://localhost:8000` |

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
