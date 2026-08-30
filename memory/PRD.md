# LifeOS PRD

## Original problem statement
Build "self AI Agent app" — pivoted by user to **LifeOS — AI-Powered Personal Life Manager**. Mobile-first dark-themed SaaS combining tasks, bills, expenses, documents, appointments, habits, shopping, and reminders with an AI Life Assistant.

## Architecture
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI + sonner + lucide-react
- **Backend**: FastAPI (async) + Motor MongoDB
- **DB**: MongoDB (`lifeos_db`) — UUID string ids, per-user data isolation on every query
- **Auth**: JWT (HS256) via httpOnly cookie + Authorization Bearer fallback
- **AI**: Claude Sonnet 4.6 via `emergentintegrations` (Universal LLM Key)

## User personas
- The everyday planner juggling work, bills, appointments, and self-care
- The knowledge worker looking for a calm dashboard instead of five tabs

## Core requirements
1. Authentication + strict data isolation
2. Dashboard with today snapshot + KPIs
3. Task manager with priorities, categories, due dates, filters
4. Bills + Expenses with month totals + top categories
5. Calendar month grid + appointments
6. Habits with weekly heatmap
7. Documents vault + mock OCR expiry detection
8. Shopping list
9. AI chat grounded in user data + "Plan my day" JSON planner
10. Global search across all entities

## Implemented (Feb 2026)
- **Backend** (`server.py`): auth (register/login/me/logout), tasks CRUD, bills CRUD + mark paid, expenses CRUD, documents + mock OCR, appointments CRUD, habits + toggle-log, shopping toggle, dashboard aggregate, global `/search`, AI chat SSE, `/ai/plan-day`, demo seed on startup
- **Frontend**: Login/Register, Layout with desktop sidebar + mobile bottom nav, Dashboard KPIs+cards, Tasks page, Money (bills/expenses tabs), Calendar month grid, Assistant streaming, More (Documents/Habits/Shopping/Account), Quick-Add modal, global search dialog
- Demo user: `demo@lifeos.app` / `lifeos123` (Riya Gope) with pre-seeded tasks/bills/expenses/appointments/habits/documents/shopping
- Testing: 33/34 backend pytest tests pass, 100% of tested frontend flows pass

## Backlog
### P1
- Login brute-force lockout (5 fails → 429)
- Recurring bill auto-generation
- Push/email reminders for tasks & bills
- Real OCR via fal.ai/Vision (currently mocked)

### P2
- Habit streak insights + reminders
- Budget goals per category
- Attach files to documents (Emergent Object Storage)
- Refactor `server.py` into per-domain routers
- Shadcn Calendar/Popover replacements for native date inputs
- Weekly / monthly analytics report

## Next tasks
1. Real OCR + file attachments to documents
2. Budget goals + savings targets
3. Habit reminder notifications
