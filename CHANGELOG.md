# Changelog

All notable changes to the **LifeOS** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-31

### Added
- **Modular Backend Architecture**: Decoupled monolithic server into dedicated domain modules:
  - `backend/config.py`: Centralized environment and settings management.
  - `backend/logger.py`: Structured JSON logging with request tracing.
  - `backend/database.py`: Clean async Mongo client lifecycle and document sanitization.
  - `backend/models.py`: Strongly typed Pydantic v2 schemas for all DTOs.
  - `backend/auth.py`: JWT utilities, bcrypt password hashing, and brute-force lockout safeguards.
  - `backend/routers/*`: Domain-separated APIRouters for `auth`, `tasks`, `bills`, `expenses`, `documents`, `appointments`, `habits`, `shopping`, `budgets`, `reminders`, `dashboard`, `ai`, and `health`.
- **Self-Contained Test Suites**:
  - Decoupled test runner from live databases using in-process `AsyncMongoMockClient`.
  - Added comprehensive fixtures in `backend/tests/conftest.py` with automatic throwaway user registration.
  - 32 automated unit and integration tests covering auth, tasks, bills, expenses, documents, OCR, habits, shopping, budgets, reminders, dashboard metrics, search, and multi-tenant data isolation.
- **Frontend Quality & Testing**:
  - ESLint 9 flat configuration (`eslint.config.mjs`) and Prettier formatting (`.prettierrc`).
  - Unit and component test suites (`ErrorBoundary.test.jsx`, `AuthContext.test.js`, `api.test.js`, `utils.test.js`, `App.test.js`).
  - Global `ErrorBoundary` React component preventing full-app blank-screen crashes.
  - User-facing error notifications via `sonner` toasts across all views (Dashboard, Money, Tasks, Calendar, Assistant, More).
- **Containerization & Dev Environments**:
  - Multi-stage production `frontend/Dockerfile` with Nginx reverse proxy.
  - Python 3.11 `backend/Dockerfile`.
  - Full-stack `docker-compose.yml` orchestrating MongoDB, FastAPI, and React with health checks.
  - `.devcontainer/devcontainer.json` for standardized VS Code / Codespaces environments.
- **Continuous Integration (CI/CD)**:
  - GitHub Actions workflow (`.github/workflows/ci.yml`) running backend linting, pytest with coverage, frontend linting, frontend tests, and production build verification on all PRs and main pushes.
  - Dependabot automated configuration (`.github/dependabot.yml`) for weekly npm and pip updates.
- **Documentation**:
  - `CONTRIBUTING.md` engineering guidelines.
  - Complete `.env.example` templates for root, backend, and frontend.
  - Enhanced `README.md` with one-command Docker launch, local setups, API docs, and testing instructions.

### Fixed
- Resolved all silent exception swallowing (`catch {}`) across frontend pages.
- Fixed duplicate CSS style key in `QuickAdd.jsx`.
- Fixed email domain validation in automated test suites.
