# Contributing to LifeOS

Thank you for your interest in contributing to LifeOS! This guide outlines our engineering standards, development workflow, and testing practices.

---

## 🛠️ Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ & Yarn / npm
- MongoDB (or Docker)

### 1. Quick Start with Docker Compose
To spin up the entire application stack including MongoDB, backend, and frontend:
```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Interactive API Docs: `http://localhost:8000/docs`

---

## 🧪 Testing Standards

All pull requests must pass backend and frontend automated tests without requiring external services.

### Running Backend Tests
Backend tests run in-memory using `mongomock-motor`:
```bash
cd backend
pytest -v
```

### Running Frontend Tests
```bash
cd frontend
npm test -- --watchAll=false
```

---

## 🧹 Code Quality & Linting

### Backend Linting
We follow PEP 8 standards. Ensure your code conforms:
```bash
flake8 backend
black --check backend
```

### Frontend Linting & Formatting
```bash
cd frontend
# Check lint rules
npm run lint
# Auto-fix lint issues
npm run lint:fix
# Format code
npm run format
```

---

## 🌿 Branching & Pull Request Process

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Commit small, focused changes that bundle unit tests proving the new behavior.
3. Verify all tests pass locally:
   - Backend: `pytest backend/tests`
   - Frontend: `cd frontend && npm test -- --watchAll=false && npm run build`
4. Submit a Pull Request targeting `main`. Ensure all GitHub Actions CI checks pass green.

---

## 🔒 Security Vulnerabilities

If you discover a security vulnerability, please do not open a public issue. Instead, report it to the maintainers at `security@lifeos.app`.
