# LifeOS — AI-Powered Personal Life Assistant

[![CI](https://github.com/riya292100/AI/actions/workflows/ci.yml/badge.svg)](https://github.com/riya292100/AI/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688.svg)](https://fastapi.tiangolo.com/)
[![Firebase Auth](https://img.shields.io/badge/Firebase-Auth-FFCA28.svg)](https://firebase.google.com/)
[![Google Cloud Run](https://img.shields.io/badge/Deploy-Cloud%20Run-4285F4.svg)](https://cloud.google.com/run)

**LifeOS** is a modern, privacy-first personal life management platform and executive assistant. Built with a modular **FastAPI** backend and a responsive **React / Tailwind CSS** frontend, LifeOS organizes your productivity, finances, schedules, health habits, shopping checklists, and document locker in one seamless interface.

---

## 🌟 Key Features

- **📊 Central Intelligence Dashboard**: Consolidated overview of daily KPIs, urgent items, upcoming commitments, and instant AI daily planning.
- **🤖 AI Life Assistant**: Real-time streaming conversational assistant grounded in your personal tasks, bills, and schedule with automatic local fallback.
- **🔐 Hybrid Authentication (Firebase + JWT)**: Support for **Google Sign-In** and **Firebase Email/Password** with backend ID token verification, automatic tenant user provisioning, plus internal JWT HttpOnly cookie fallback.
- **✅ Task & Goal Management**: Priority queues, category segmentation, due dates, and completion status.
- **💳 Financial Tracker & Budgets**: Track upcoming bills with deadline alerts, log categorized expenses, and monitor monthly budget caps with threshold warnings (80% / 100%).
- **📄 Smart Document Locker & OCR**: Secure repository for critical personal documents (IDs, insurance cards, warranties) with automated OCR expiry date parsing.
- **📅 Schedule & Calendar**: Interactive calendar view with proactive alert markers.
- **🎯 Habits & Daily Routines**: Daily consistency tracking, streak calculations, and completion logs.
- **🛒 Shopping Lists**: Dynamic checklist for household and grocery items with real-time toggle.
- **🔔 Proactive Notifications**: Centralized reminder engine alerting you on overdue bills, expiring documents, approaching appointments, and budget caps.
- **☁️ Cloud Run & Unified Deployment**: Ready for multi-container development via Docker Compose or unified single-container deployment to Google Cloud Run.
- **💾 Zero-Dependency In-Memory DB**: Automatically detects if a live MongoDB instance is available, falling back gracefully to an in-memory database for instant local testing.

---

## 🏗️ Architecture & Tech Stack

```
LifeOS/
├── .github/
│   ├── workflows/ci.yml      # GitHub Actions CI pipeline (backend + frontend)
│   └── dependabot.yml        # Automated weekly dependency management
├── .devcontainer/            # Standardized development container config
├── Dockerfile                # Multi-stage production container for Cloud Run
├── cloudbuild.yaml           # Automated Google Cloud Build configuration
├── deploy_cloud_run.ps1      # PowerShell one-click Cloud Run deployment script
├── backend/
│   ├── routers/              # Modular domain API routers
│   │   ├── auth.py           # Registration, login, profile, and sync endpoints
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
│   ├── tests/                # Self-contained in-memory test suite
│   │   ├── conftest.py       # Pytest fixtures (mongomock, TestClient, test user)
│   │   └── backend_test.py   # Full API regression suite
│   ├── auth.py               # Firebase token verification, password hashing, JWT
│   ├── config.py             # Environment settings & CORS
│   ├── database.py           # Live MongoDB client + in-memory auto-fallback
│   ├── logger.py             # Structured JSON logger
│   ├── models.py             # Typed Pydantic v2 schemas
│   ├── seed.py               # Demo database populator
│   ├── server.py             # FastAPI entry point & SPA static asset server
│   ├── Dockerfile            # Standalone backend container
│   └── requirements.txt      # Production backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components & ErrorBoundary
│   │   ├── contexts/         # Authentication (Firebase + JWT) & global state
│   │   ├── lib/              # API client, Firebase config, and utilities
│   │   │   ├── api.js        # Axios instance with credentials
│   │   │   └── firebase.js   # Firebase Client SDK initialization & helpers
│   │   ├── pages/            # Views (Dashboard, Money, Tasks, Calendar, etc.)
│   │   └── App.js            # App routing & providers
│   ├── Dockerfile            # Multi-stage Nginx production build
│   ├── nginx.conf            # SPA routing & reverse proxy
│   ├── eslint.config.mjs     # ESLint flat configuration
│   ├── package.json          # Node dependencies & scripts
│   └── tailwind.config.js    # Tailwind CSS design system
├── docker-compose.yml        # Full-stack container orchestrator
├── CHANGELOG.md              # Semantic release notes
├── CONTRIBUTING.md           # Engineering guidelines
└── README.md                 # Project documentation
```

---

## 🚀 Quick Start with Docker Compose

Start the entire application stack (MongoDB + FastAPI + React) with a single command:

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

## ☁️ Deploying to Google Cloud Run

LifeOS includes a unified multi-stage [Dockerfile](file:///Dockerfile) and deployment automation for Google Cloud Run:

### Option 1: Automated Script (PowerShell)
```powershell
.\deploy_cloud_run.ps1 -ProjectId "your-gcp-project-id" -Region "us-central1"
```

### Option 2: Cloud Build CLI
```bash
gcloud builds submit --config=cloudbuild.yaml
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Python** 3.11+
- **Node.js** 20+ & **npm** or **yarn**
- **MongoDB** running on `localhost:27017` *(optional: an in-memory database will automatically take over if MongoDB is unreachable)*

### 2. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
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
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env

# Start development server
npm start
```

---

## 🔥 Firebase Authentication Setup (Optional)

To enable **Google Sign-In** and **Firebase Authentication**:

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Google** and **Email/Password** under **Authentication > Sign-in method**.
3. Register a Web App in Firebase Project Settings and copy the configuration keys into `frontend/.env`:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```
4. Set `FIREBASE_PROJECT_ID=your_project_id` in `backend/.env`.
*(If not configured, LifeOS seamlessly falls back to demo account & local JWT auth).*

---

## 🧪 Running Tests

### Backend Regression Suite
Backend tests run in-memory using `mongomock-motor` with parallel execution via `pytest-xdist`:
```bash
python -m pytest backend/tests -c backend/pytest.ini -v --cov=backend
```

### Frontend Test Suite
Frontend unit & component tests run via Jest / React Testing Library:
```bash
cd frontend
npm test -- --watchAll=false
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MONGO_URL` | MongoDB connection URI | `mongodb://localhost:27017` |
| `DB_NAME` | MongoDB database name | `lifeos_db` |
| `USE_MOCK_DB` | Force in-memory database (`true`/`false`) | Auto-detect |
| `JWT_SECRET` | Secret key for signing internal JWT tokens | `lifeos_dev_secret_key` |
| `FIREBASE_PROJECT_ID` | Firebase project ID for token verification | `""` |
| `EMERGENT_LLM_KEY` | Optional LLM API key for AI chat & OCR | `""` |
| `ADMIN_EMAIL` | Default demo user email | `demo@lifeos.app` |
| `ADMIN_PASSWORD` | Default demo user password | `lifeos123` |
| `FRONTEND_URL` | Allowed origin for frontend app | `http://localhost:3000` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated or `*`) | `*` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `REACT_APP_BACKEND_URL` | Backend API URL | `http://localhost:8000` |
| `REACT_APP_FIREBASE_API_KEY` | Firebase Web API Key | `""` |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `""` |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase Project ID | `""` |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `""` |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `""` |
| `REACT_APP_FIREBASE_APP_ID` | Firebase Web App ID | `""` |

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
