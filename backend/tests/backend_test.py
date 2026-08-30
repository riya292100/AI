"""LifeOS backend API regression tests."""
import os
import re
import json
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"


def today_plus(n):
    return (datetime.now(timezone.utc) + timedelta(days=n)).date().isoformat()


@pytest.fixture(scope="session")
def test_credentials():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("Missing test_credentials.md")
    c = p.read_text(encoding="utf-8")
    e = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?email(?:\*\*)?\s*:\s*`?([^`\s]+)', c)
    pw = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?password(?:\*\*)?\s*:\s*`?([^`\s]+)', c)
    if not e or not pw:
        pytest.skip("No creds in test_credentials.md")
    return {"email": e.group(1), "password": pw.group(1)}


@pytest.fixture(scope="session")
def demo_token(test_credentials):
    r = requests.post(f"{API}/auth/login", json=test_credentials, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Demo login failed {r.status_code}: {r.text[:300]}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def client(demo_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"})
    return s


# --------------------------------------------------------------- Health / Auth
class TestHealthAndAuth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=30)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_login_success_sets_cookie(self, test_credentials):
        r = requests.post(f"{API}/auth/login", json=test_credentials, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == test_credentials["email"]
        assert isinstance(d["token"], str) and len(d["token"]) > 20
        assert "id" in d
        set_cookie = r.headers.get("set-cookie", "")
        assert "access_token" in set_cookie, f"no auth cookie: {set_cookie}"
        assert "HttpOnly" in set_cookie, f"cookie not httpOnly: {set_cookie}"

    def test_login_wrong_password(self, test_credentials):
        r = requests.post(f"{API}/auth/login", json={"email": test_credentials["email"], "password": "wrongpass!!"}, timeout=30)
        assert r.status_code == 401

    def test_login_unknown_email(self):
        r = requests.post(f"{API}/auth/login", json={"email": "nope_qa@qamail.com", "password": "x123456"}, timeout=30)
        assert r.status_code == 401

    def test_brute_force_lockout(self, test_credentials):
        """Playbook expectation: account lockout after 5 failed attempts."""
        codes = []
        for _ in range(6):
            r = requests.post(f"{API}/auth/login", json={"email": test_credentials["email"], "password": "badpass1"}, timeout=30)
            codes.append(r.status_code)
        # After 5 failures we expect 423/429 rather than plain 401
        assert any(c in (423, 429) for c in codes), f"No lockout/rate-limit after 6 failures: {codes}"

    def test_register_and_me_and_logout(self):
        email = f"test_qa_{uuid.uuid4().hex[:8]}@qamail.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "TEST QA"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["email"] == email
        token = d["token"]

        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert me.status_code == 200
        mu = me.json()
        assert mu["email"] == email
        assert "password_hash" not in mu and "_id" not in mu

        dup = requests.post(f"{API}/auth/register", json={"email": email, "password": "secret123"}, timeout=30)
        assert dup.status_code == 400

        out = requests.post(f"{API}/auth/logout", timeout=30)
        assert out.status_code == 200

    def test_register_weak_password_rejected(self):
        r = requests.post(f"{API}/auth/register", json={"email": f"test_w_{uuid.uuid4().hex[:6]}@qamail.com", "password": "123"}, timeout=30)
        assert r.status_code == 422

    def test_invalid_token_rejected(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.here"}, timeout=30)
        assert r.status_code == 401


# --------------------------------------------------------------- Tasks CRUD
class TestTasks:
    def test_task_crud(self, client):
        payload = {"title": "TEST_task_crud", "priority": "high", "category": "work", "due_date": today_plus(0)}
        r = client.post(f"{API}/tasks", json=payload, timeout=30)
        assert r.status_code == 200, r.text[:300]
        t = r.json()
        assert t["title"] == payload["title"] and t["priority"] == "high" and t["status"] == "todo"
        assert "_id" not in t
        tid = t["id"]

        lst = client.get(f"{API}/tasks", timeout=30).json()
        assert any(x["id"] == tid for x in lst)

        up = client.patch(f"{API}/tasks/{tid}", json={"status": "done", "title": "TEST_task_done"}, timeout=30)
        assert up.status_code == 200
        assert up.json()["status"] == "done"

        lst2 = client.get(f"{API}/tasks", timeout=30).json()
        found = next(x for x in lst2 if x["id"] == tid)
        assert found["status"] == "done" and found["title"] == "TEST_task_done"

        dl = client.delete(f"{API}/tasks/{tid}", timeout=30)
        assert dl.status_code == 200
        lst3 = client.get(f"{API}/tasks", timeout=30).json()
        assert not any(x["id"] == tid for x in lst3)

    def test_patch_missing_task_404(self, client):
        r = client.patch(f"{API}/tasks/{uuid.uuid4()}", json={"status": "done"}, timeout=30)
        assert r.status_code == 404

    def test_delete_missing_task_404(self, client):
        r = client.delete(f"{API}/tasks/{uuid.uuid4()}", timeout=30)
        assert r.status_code == 404

    def test_invalid_priority_422(self, client):
        r = client.post(f"{API}/tasks", json={"title": "TEST_bad", "priority": "urgent"}, timeout=30)
        assert r.status_code == 422

    def test_tasks_requires_auth(self):
        assert requests.get(f"{API}/tasks", timeout=30).status_code == 401


# --------------------------------------------------------------- Bills
class TestBills:
    def test_bill_crud_and_mark_paid(self, client):
        r = client.post(f"{API}/bills", json={"name": "TEST_bill", "amount": 55.5, "due_date": today_plus(4)}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        b = r.json()
        assert b["amount"] == 55.5 and b["status"] == "upcoming"
        bid = b["id"]

        up = client.patch(f"{API}/bills/{bid}", json={"status": "paid"}, timeout=30)
        assert up.status_code == 200 and up.json()["status"] == "paid"

        lst = client.get(f"{API}/bills", timeout=30).json()
        assert next(x for x in lst if x["id"] == bid)["status"] == "paid"

        assert client.delete(f"{API}/bills/{bid}", timeout=30).status_code == 200
        assert client.delete(f"{API}/bills/{bid}", timeout=30).status_code == 404


# --------------------------------------------------------------- Expenses
class TestExpenses:
    def test_expense_create_list_delete(self, client):
        r = client.post(f"{API}/expenses", json={"amount": 21.75, "category": "food", "notes": "TEST_expense"}, timeout=30)
        assert r.status_code == 200
        e = r.json()
        assert e["amount"] == 21.75 and e["date"]
        eid = e["id"]
        lst = client.get(f"{API}/expenses", timeout=30).json()
        assert any(x["id"] == eid for x in lst)
        assert client.delete(f"{API}/expenses/{eid}", timeout=30).status_code == 200
        assert not any(x["id"] == eid for x in client.get(f"{API}/expenses", timeout=30).json())


# --------------------------------------------------------------- Documents (mock OCR)
class TestDocuments:
    @pytest.mark.parametrize("dtype", ["id", "insurance", "warranty"])
    def test_mock_ocr_autofills_expiry(self, client, dtype):
        r = client.post(f"{API}/documents", json={"name": f"TEST_doc_{dtype}", "type": dtype}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["expiry_date"], "expiry not auto-filled"
        days = (datetime.fromisoformat(d["expiry_date"]).date() - datetime.now(timezone.utc).date()).days
        assert 175 <= days <= 185, f"expiry {days} days out, expected ~180"
        client.delete(f"{API}/documents/{d['id']}", timeout=30)

    def test_no_autofill_for_receipt(self, client):
        r = client.post(f"{API}/documents", json={"name": "TEST_doc_receipt", "type": "receipt"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert not d.get("expiry_date")
        client.delete(f"{API}/documents/{d['id']}", timeout=30)


# --------------------------------------------------------------- Appointments
class TestAppointments:
    def test_appointment_crud(self, client):
        starts = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        r = client.post(f"{API}/appointments", json={"title": "TEST_appt", "starts_at": starts, "location": "TEST_loc"}, timeout=30)
        assert r.status_code == 200
        a = r.json()
        assert a["title"] == "TEST_appt"
        assert any(x["id"] == a["id"] for x in client.get(f"{API}/appointments", timeout=30).json())
        assert client.delete(f"{API}/appointments/{a['id']}", timeout=30).status_code == 200


# --------------------------------------------------------------- Habits
class TestHabits:
    def test_habit_create_and_log_toggle(self, client):
        r = client.post(f"{API}/habits", json={"name": "TEST_habit", "target_days_per_week": 4}, timeout=30)
        assert r.status_code == 200
        h = r.json()
        assert h["logs"] == []
        hid = h["id"]
        day = today_plus(0)
        on = client.post(f"{API}/habits/{hid}/log", json={"date": day}, timeout=30)
        assert on.status_code == 200 and day in on.json()["logs"]
        off = client.post(f"{API}/habits/{hid}/log", json={"date": day}, timeout=30)
        assert off.status_code == 200 and day not in off.json()["logs"]
        assert client.delete(f"{API}/habits/{hid}", timeout=30).status_code == 200


# --------------------------------------------------------------- Shopping
class TestShopping:
    def test_shopping_crud_and_toggle(self, client):
        r = client.post(f"{API}/shopping", json={"name": "TEST_item", "quantity": 3}, timeout=30)
        assert r.status_code == 200
        it = r.json()
        assert it["checked"] is False and it["quantity"] == 3
        sid = it["id"]
        t1 = client.patch(f"{API}/shopping/{sid}", timeout=30)
        assert t1.status_code == 200 and t1.json()["checked"] is True
        t2 = client.patch(f"{API}/shopping/{sid}", timeout=30)
        assert t2.json()["checked"] is False
        assert client.delete(f"{API}/shopping/{sid}", timeout=30).status_code == 200


# --------------------------------------------------------------- Dashboard
class TestDashboard:
    def test_dashboard_shape(self, client):
        r = client.get(f"{API}/dashboard", timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for k in ["counts", "money", "due_today", "upcoming_bills", "next_appointment", "expiring_documents", "upcoming_tasks"]:
            assert k in d, f"missing {k}"
        for k in ["open_tasks", "due_today", "upcoming_bills", "habits"]:
            assert isinstance(d["counts"][k], int)
        assert isinstance(d["money"]["month_expense"], (int, float))
        assert isinstance(d["money"]["total_owed"], (int, float))
        assert d["money"]["currency"] == "USD"
        assert d["counts"]["open_tasks"] > 0, "demo seed should have open tasks"
        for b in d["upcoming_bills"]:
            assert "days_until" in b and b["status"] != "paid"
        assert d["next_appointment"] is not None
        assert json.dumps(d)  # serializable, no ObjectId

    def test_dashboard_reflects_new_expense(self, client):
        before = client.get(f"{API}/dashboard", timeout=30).json()["money"]["month_expense"]
        e = client.post(f"{API}/expenses", json={"amount": 33.0, "category": "misc", "notes": "TEST_dash"}, timeout=30).json()
        after = client.get(f"{API}/dashboard", timeout=30).json()["money"]["month_expense"]
        assert round(after - before, 2) == 33.0, f"{before} -> {after}"
        client.delete(f"{API}/expenses/{e['id']}", timeout=30)


# --------------------------------------------------------------- Search
class TestSearch:
    def test_search_finds_task(self, client):
        t = client.post(f"{API}/tasks", json={"title": "TEST_zzsearchable widget"}, timeout=30).json()
        r = client.get(f"{API}/search", params={"q": "zzsearchable"}, timeout=30)
        assert r.status_code == 200
        res = r.json()["results"]
        assert any(x["kind"] == "task" and x["id"] == t["id"] for x in res)
        client.delete(f"{API}/tasks/{t['id']}", timeout=30)

    def test_search_short_query(self, client):
        r = client.get(f"{API}/search", params={"q": "a"}, timeout=30)
        assert r.status_code == 200 and r.json()["results"] == []

    def test_search_missing_param(self, client):
        assert client.get(f"{API}/search", timeout=30).status_code == 422


# --------------------------------------------------------------- Data isolation
class TestDataIsolation:
    @pytest.fixture(scope="class")
    def two_users(self):
        users = []
        for _ in range(2):
            email = f"test_iso_{uuid.uuid4().hex[:8]}@qamail.com"
            r = requests.post(f"{API}/auth/register", json={"email": email, "password": "secret123"}, timeout=30)
            assert r.status_code == 200, r.text[:200]
            s = requests.Session()
            s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
            users.append(s)
        return users

    def test_user_b_cannot_see_user_a_data(self, two_users):
        a, b = two_users
        ta = a.post(f"{API}/tasks", json={"title": "TEST_private_A"}, timeout=30).json()
        ba = a.post(f"{API}/bills", json={"name": "TEST_private_bill_A", "amount": 10, "due_date": today_plus(3)}, timeout=30).json()

        assert b.get(f"{API}/tasks", timeout=30).json() == []
        assert b.get(f"{API}/bills", timeout=30).json() == []
        assert b.get(f"{API}/search", params={"q": "private"}, timeout=30).json()["results"] == []
        assert b.patch(f"{API}/tasks/{ta['id']}", json={"status": "done"}, timeout=30).status_code == 404
        assert b.delete(f"{API}/tasks/{ta['id']}", timeout=30).status_code == 404
        assert b.patch(f"{API}/bills/{ba['id']}", json={"status": "paid"}, timeout=30).status_code == 404
        dash = b.get(f"{API}/dashboard", timeout=30).json()
        assert dash["counts"]["open_tasks"] == 0 and dash["counts"]["upcoming_bills"] == 0
        a.delete(f"{API}/tasks/{ta['id']}", timeout=30)
        a.delete(f"{API}/bills/{ba['id']}", timeout=30)


# --------------------------------------------------------------- AI
class TestAI:
    def test_ai_chat_streams_sse(self, demo_token):
        r = requests.post(f"{API}/ai/chat", json={"message": "In one short sentence, what should I focus on today?"},
                          headers={"Authorization": f"Bearer {demo_token}"}, stream=True, timeout=120)
        assert r.status_code == 200, r.text[:300]
        assert "text/event-stream" in r.headers.get("content-type", "")
        deltas, done, errors = 0, False, []
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            ev = json.loads(line[6:])
            if ev.get("type") == "delta":
                deltas += 1
            elif ev.get("type") == "done":
                done = True
                break
            elif ev.get("type") == "error":
                errors.append(ev)
        assert not errors, f"AI stream error: {errors}"
        assert deltas > 0, "no delta events received"
        assert done, "no done event received"

    def test_ai_chat_empty_message_400(self, client):
        r = client.post(f"{API}/ai/chat", json={"message": "   "}, timeout=30)
        assert r.status_code == 400

    def test_ai_chat_requires_auth(self):
        assert requests.post(f"{API}/ai/chat", json={"message": "hi"}, timeout=30).status_code == 401

    def test_plan_day(self, client):
        r = client.post(f"{API}/ai/plan-day", timeout=150)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        for k in ["summary", "focus", "schedule", "reminders"]:
            assert k in d, f"missing {k} in plan-day: {list(d)}"
        assert isinstance(d["summary"], str) and d["summary"].strip()
        assert isinstance(d["focus"], list) and len(d["focus"]) > 0
        assert isinstance(d["schedule"], list) and len(d["schedule"]) > 0
        assert all("time" in s and "task" in s for s in d["schedule"])

    def test_ai_messages_history(self, client):
        r = client.get(f"{API}/ai/messages", timeout=30)
        assert r.status_code == 200
        msgs = r.json()
        assert isinstance(msgs, list)
        if msgs:
            assert {"role", "content"} <= set(msgs[-1])
