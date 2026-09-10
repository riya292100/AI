"""LifeOS backend API regression tests (Self-Contained in-memory suite)."""
import uuid
from datetime import datetime, timezone, timedelta


def today_plus(n: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=n)).date().isoformat()


# --------------------------------------------------------------- Health & Auth
class TestHealthAndAuth:
    def test_root(self, api_client):
        r = api_client.get("/api/")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_me_requires_auth(self, api_client):
        r = api_client.get("/api/auth/me")
        assert r.status_code == 401

    def test_login_success_sets_cookie(self, api_client, test_user):
        r = api_client.post(
            "/api/auth/login",
            json={"email": test_user["email"], "password": test_user["password"]},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == test_user["email"]
        assert isinstance(d["token"], str) and len(d["token"]) > 20
        assert "id" in d
        set_cookie = r.headers.get("set-cookie", "")
        assert "access_token" in set_cookie
        assert "HttpOnly" in set_cookie or "httponly" in set_cookie.lower()

    def test_login_wrong_password(self, api_client, test_user):
        r = api_client.post(
            "/api/auth/login",
            json={"email": test_user["email"], "password": "wrongpassword123"},
        )
        assert r.status_code == 401

    def test_login_unknown_email(self, api_client):
        r = api_client.post(
            "/api/auth/login",
            json={"email": "nonexistent_qa@qamail.com", "password": "password123"},
        )
        assert r.status_code == 401

    def test_brute_force_lockout(self, api_client, test_user):
        """Account lockout after 5 failed attempts within window."""
        codes = []
        for _ in range(6):
            r = api_client.post(
                "/api/auth/login",
                json={"email": test_user["email"], "password": "badpassword!"},
            )
            codes.append(r.status_code)
        assert any(c in (423, 429) for c in codes), f"Expected rate limit status: {codes}"

    def test_register_and_me_and_logout(self, api_client):
        email = f"test_qa_{uuid.uuid4().hex[:8]}@qamail.com"
        r = api_client.post(
            "/api/auth/register",
            json={"email": email, "password": "secretpassword123", "name": "TEST QA"},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == email
        token = d["token"]

        me = api_client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert me.status_code == 200
        mu = me.json()
        assert mu["email"] == email
        assert "password_hash" not in mu and "_id" not in mu

        dup = api_client.post(
            "/api/auth/register", json={"email": email, "password": "secretpassword123"}
        )
        assert dup.status_code == 400

        out = api_client.post("/api/auth/logout")
        assert out.status_code == 200

    def test_register_weak_password_rejected(self, api_client):
        r = api_client.post(
            "/api/auth/register",
            json={"email": f"test_w_{uuid.uuid4().hex[:6]}@qamail.com", "password": "123"},
        )
        assert r.status_code == 422

    def test_invalid_token_rejected(self, api_client):
        r = api_client.get(
            "/api/auth/me", headers={"Authorization": "Bearer garbage.invalid.token"}
        )
        assert r.status_code == 401

    def test_firebase_token_auto_provisions_user(self, api_client):
        import jwt as pyjwt
        fb_uid = f"fb_{uuid.uuid4().hex[:10]}"
        fb_email = f"{fb_uid}@gmail.com"
        fb_payload = {
            "iss": "https://securetoken.google.com/test-project",
            "aud": "test-project",
            "auth_time": int(datetime.now(timezone.utc).timestamp()),
            "user_id": fb_uid,
            "sub": fb_uid,
            "email": fb_email,
            "name": "Firebase User",
            "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
        }
        fb_token = pyjwt.encode(fb_payload, "dummy_secret", algorithm="HS256")
        r = api_client.get("/api/auth/me", headers={"Authorization": f"Bearer {fb_token}"})
        assert r.status_code == 200
        u = r.json()
        assert u["id"] == fb_uid
        assert u["email"] == fb_email
        assert u["name"] == "Firebase User"
        assert u.get("auth_provider") == "firebase"

        # Test sync endpoint
        sync_r = api_client.post(
            "/api/auth/sync",
            headers={"Authorization": f"Bearer {fb_token}"},
            json={"name": "Updated Firebase User", "photo_url": "https://example.com/avatar.png"},
        )
        assert sync_r.status_code == 200
        updated = sync_r.json()
        assert updated["name"] == "Updated Firebase User"
        assert updated["photo_url"] == "https://example.com/avatar.png"


# --------------------------------------------------------------- Tasks
class TestTasks:
    def test_task_crud(self, client):
        payload = {
            "title": "TEST_task_crud",
            "priority": "high",
            "category": "work",
            "due_date": today_plus(0),
        }
        r = client.post("/api/tasks", json=payload)
        assert r.status_code == 200
        t = r.json()
        assert t["title"] == payload["title"] and t["priority"] == "high" and t["status"] == "todo"
        assert "_id" not in t
        tid = t["id"]

        lst = client.get("/api/tasks").json()
        assert any(x["id"] == tid for x in lst)

        up = client.patch(f"/api/tasks/{tid}", json={"status": "done", "title": "TEST_task_done"})
        assert up.status_code == 200
        assert up.json()["status"] == "done"

        lst2 = client.get("/api/tasks").json()
        found = next(x for x in lst2 if x["id"] == tid)
        assert found["status"] == "done" and found["title"] == "TEST_task_done"

        dl = client.delete(f"/api/tasks/{tid}")
        assert dl.status_code == 200
        lst3 = client.get("/api/tasks").json()
        assert not any(x["id"] == tid for x in lst3)

    def test_patch_missing_task_404(self, client):
        r = client.patch(f"/api/tasks/{uuid.uuid4()}", json={"status": "done"})
        assert r.status_code == 404

    def test_delete_missing_task_404(self, client):
        r = client.delete(f"/api/tasks/{uuid.uuid4()}")
        assert r.status_code == 404

    def test_invalid_priority_422(self, client):
        r = client.post("/api/tasks", json={"title": "TEST_bad", "priority": "urgent"})
        assert r.status_code == 422

    def test_tasks_requires_auth(self, api_client):
        assert api_client.get("/api/tasks").status_code == 401


# --------------------------------------------------------------- Bills
class TestBills:
    def test_bill_crud_and_mark_paid(self, client):
        r = client.post(
            "/api/bills",
            json={"name": "TEST_bill", "amount": 55.5, "due_date": today_plus(4)},
        )
        assert r.status_code == 200
        b = r.json()
        assert b["amount"] == 55.5 and b["status"] == "upcoming"
        bid = b["id"]

        up = client.patch(f"/api/bills/{bid}", json={"status": "paid"})
        assert up.status_code == 200 and up.json()["status"] == "paid"

        lst = client.get("/api/bills").json()
        assert next(x for x in lst if x["id"] == bid)["status"] == "paid"

        assert client.delete(f"/api/bills/{bid}").status_code == 200
        assert client.delete(f"/api/bills/{bid}").status_code == 404


# --------------------------------------------------------------- Expenses
class TestExpenses:
    def test_expense_create_list_delete(self, client):
        r = client.post(
            "/api/expenses",
            json={"amount": 21.75, "category": "food", "notes": "TEST_expense"},
        )
        assert r.status_code == 200
        e = r.json()
        assert e["amount"] == 21.75 and e["date"]
        eid = e["id"]
        lst = client.get("/api/expenses").json()
        assert any(x["id"] == eid for x in lst)
        assert client.delete(f"/api/expenses/{eid}").status_code == 200
        assert not any(x["id"] == eid for x in client.get("/api/expenses").json())


# --------------------------------------------------------------- Documents
class TestDocuments:
    def test_mock_ocr_autofills_expiry(self, client):
        for dtype in ["id", "insurance", "warranty"]:
            r = client.post(
                "/api/documents", json={"name": f"TEST_doc_{dtype}", "type": dtype}
            )
            assert r.status_code == 200
            d = r.json()
            assert d["expiry_date"], f"expiry not auto-filled for {dtype}"
            days = (
                datetime.fromisoformat(d["expiry_date"]).date()
                - datetime.now(timezone.utc).date()
            ).days
            assert 175 <= days <= 185, f"expiry {days} days out, expected ~180"
            client.delete(f"/api/documents/{d['id']}")

    def test_no_autofill_for_receipt(self, client):
        r = client.post(
            "/api/documents", json={"name": "TEST_doc_receipt", "type": "receipt"}
        )
        assert r.status_code == 200
        d = r.json()
        assert not d.get("expiry_date")
        client.delete(f"/api/documents/{d['id']}")


# --------------------------------------------------------------- Appointments
class TestAppointments:
    def test_appointment_crud(self, client):
        starts = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        r = client.post(
            "/api/appointments",
            json={"title": "TEST_appt", "starts_at": starts, "location": "TEST_loc"},
        )
        assert r.status_code == 200
        a = r.json()
        assert a["title"] == "TEST_appt"
        assert any(x["id"] == a["id"] for x in client.get("/api/appointments").json())
        assert client.delete(f"/api/appointments/{a['id']}").status_code == 200


# --------------------------------------------------------------- Habits
class TestHabits:
    def test_habit_create_and_log_toggle(self, client):
        r = client.post(
            "/api/habits", json={"name": "TEST_habit", "target_days_per_week": 4}
        )
        assert r.status_code == 200
        h = r.json()
        assert h["logs"] == []
        hid = h["id"]
        day = today_plus(0)
        on = client.post(f"/api/habits/{hid}/log", json={"date": day})
        assert on.status_code == 200 and day in on.json()["logs"]
        off = client.post(f"/api/habits/{hid}/log", json={"date": day})
        assert off.status_code == 200 and day not in off.json()["logs"]
        assert client.delete(f"/api/habits/{hid}").status_code == 200


# --------------------------------------------------------------- Shopping
class TestShopping:
    def test_shopping_crud_and_toggle(self, client):
        r = client.post("/api/shopping", json={"name": "TEST_item", "quantity": 3})
        assert r.status_code == 200
        it = r.json()
        assert it["checked"] is False and it["quantity"] == 3
        sid = it["id"]
        t1 = client.patch(f"/api/shopping/{sid}")
        assert t1.status_code == 200 and t1.json()["checked"] is True
        t2 = client.patch(f"/api/shopping/{sid}")
        assert t2.json()["checked"] is False
        assert client.delete(f"/api/shopping/{sid}").status_code == 200


# --------------------------------------------------------------- Budgets
class TestBudgets:
    def test_budget_crud_and_calculation(self, client):
        r = client.post("/api/budgets", json={"category": "groceries", "monthly_cap": 500.0})
        assert r.status_code == 200
        b = r.json()
        assert b["category"] == "groceries" and b["monthly_cap"] == 500.0
        bid = b["id"]

        # Log expense in this category
        client.post("/api/expenses", json={"amount": 125.0, "category": "groceries"})
        lst = client.get("/api/budgets").json()
        found = next(x for x in lst if x["id"] == bid)
        assert found["spent"] == 125.0
        assert found["percent"] == 25.0

        assert client.delete(f"/api/budgets/{bid}").status_code == 200


# --------------------------------------------------------------- Reminders
class TestReminders:
    def test_reminders_and_dismissal(self, client):
        # Create an upcoming bill
        bill = client.post(
            "/api/bills",
            json={"name": "Internet Bill", "amount": 60.0, "due_date": today_plus(0)},
        ).json()

        reminders = client.get("/api/reminders").json()
        assert "items" in reminders and "unread" in reminders
        assert any(bill["id"] in r["id"] or r["entity_id"] == bill["id"] for r in reminders["items"])

        # Dismiss
        dismiss_key = f"bill-soon-{bill['id']}-{today_plus(0)}"
        d_res = client.post("/api/reminders/dismiss", json={"key": dismiss_key})
        assert d_res.status_code == 200


# --------------------------------------------------------------- Dashboard & Search
class TestDashboard:
    def test_dashboard_shape(self, client):
        client.post("/api/tasks", json={"title": "Dashboard Task", "priority": "high", "due_date": today_plus(0)})
        client.post("/api/bills", json={"name": "Gas Bill", "amount": 45.0, "due_date": today_plus(5)})
        client.post("/api/expenses", json={"amount": 30.0, "category": "misc"})

        r = client.get("/api/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in [
            "counts",
            "money",
            "due_today",
            "upcoming_bills",
            "next_appointment",
            "expiring_documents",
            "upcoming_tasks",
        ]:
            assert k in d, f"missing {k}"
        assert d["counts"]["open_tasks"] >= 1
        assert d["counts"]["due_today"] >= 1

    def test_search_finds_task(self, client):
        t = client.post("/api/tasks", json={"title": "UniqueSearchQueryItem"}).json()
        r = client.get("/api/search", params={"q": "UniqueSearch"})
        assert r.status_code == 200
        res = r.json()["results"]
        assert any(x["kind"] == "task" and x["id"] == t["id"] for x in res)

    def test_search_short_query(self, client):
        r = client.get("/api/search", params={"q": "a"})
        assert r.status_code == 200 and r.json()["results"] == []

    def test_search_missing_param(self, client):
        assert client.get("/api/search").status_code == 422


# --------------------------------------------------------------- Data Isolation
class TestDataIsolation:
    def test_user_b_cannot_see_user_a_data(self, api_client):
        # Register user A
        email_a = f"iso_a_{uuid.uuid4().hex[:6]}@qamail.com"
        ra = api_client.post("/api/auth/register", json={"email": email_a, "password": "PasswordA123"})
        token_a = ra.json()["token"]

        # Register user B
        email_b = f"iso_b_{uuid.uuid4().hex[:6]}@qamail.com"
        rb = api_client.post("/api/auth/register", json={"email": email_b, "password": "PasswordB123"})
        token_b = rb.json()["token"]

        # User A creates a task and bill
        ta = api_client.post(
            "/api/tasks",
            json={"title": "Private Task A"},
            headers={"Authorization": f"Bearer {token_a}"},
        ).json()
        ba = api_client.post(
            "/api/bills",
            json={"name": "Private Bill A", "amount": 100, "due_date": today_plus(2)},
            headers={"Authorization": f"Bearer {token_a}"},
        ).json()

        # User B queries tasks and bills
        b_tasks = api_client.get("/api/tasks", headers={"Authorization": f"Bearer {token_b}"}).json()
        b_bills = api_client.get("/api/bills", headers={"Authorization": f"Bearer {token_b}"}).json()
        assert b_tasks == []
        assert b_bills == []

        # User B tries to update and delete User A's task
        patch_res = api_client.patch(
            f"/api/tasks/{ta['id']}",
            json={"status": "done"},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert patch_res.status_code == 404

        del_res = api_client.delete(
            f"/api/tasks/{ta['id']}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert del_res.status_code == 404


# --------------------------------------------------------------- AI
class TestAI:
    def test_ai_chat_streams_sse(self, client):
        r = client.post("/api/ai/chat", json={"message": "What should I focus on?"})
        assert r.status_code == 200
        assert "text/event-stream" in r.headers.get("content-type", "")

    def test_ai_chat_empty_message_400(self, client):
        r = client.post("/api/ai/chat", json={"message": "   "})
        assert r.status_code == 400

    def test_plan_day(self, client):
        r = client.post("/api/ai/plan-day")
        assert r.status_code == 200
        d = r.json()
        for k in ["summary", "focus", "schedule", "reminders"]:
            assert k in d, f"missing {k} in plan-day"

    def test_ai_messages_history(self, client):
        r = client.get("/api/ai/messages")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --------------------------------------------------------------- Hardened Private Workspace
class TestPrivateWorkspace:
    def test_health_has_mongo_source_of_truth(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("mongo_source_of_truth") is True
        assert data.get("status") == "healthy"

    def test_session_unauthenticated_returns_none(self, api_client):
        r = api_client.get("/api/auth/session")
        assert r.status_code == 200
        assert r.json() is None

    def test_demo_login_and_session(self, api_client):
        r = api_client.post("/api/auth/demo-login")
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "demo@lifeos.internal"
        assert data["auth_mode"] == "MOCK"
        assert "token" in data

        token = data["token"]
        # Verify session via cookie and via Bearer token
        s_cookie = api_client.get("/api/auth/session", cookies={"access_token": token})
        assert s_cookie.status_code == 200
        sess = s_cookie.json()
        assert sess is not None
        assert sess["email"] == "demo@lifeos.internal"
        assert sess["auth_mode"] == "MOCK"

        s_bearer = api_client.get("/api/auth/session", headers={"Authorization": f"Bearer {token}"})
        assert s_bearer.status_code == 200
        assert s_bearer.json()["email"] == "demo@lifeos.internal"

    def test_workspace_items_crud_and_locking(self, client):
        # Create item
        payload = {
            "category": "reminder",
            "title": "Review security boundary",
            "note": "Verify isolation rules",
        }
        create_res = client.post("/api/workspace/items", json=payload)
        assert create_res.status_code == 200
        item = create_res.json()
        assert item["title"] == "Review security boundary"
        assert item["category"] == "reminder"
        assert item["status"] == "open"
        assert item["version"] == 1
        item_id = item["id"]

        # List items with pagination
        list_res = client.get("/api/workspace/items?limit=10&offset=0")
        assert list_res.status_code == 200
        page = list_res.json()
        assert "items" in page
        assert page["total"] >= 1
        assert any(i["id"] == item_id for i in page["items"])

        # Patch item status with matching version
        patch_res = client.patch(
            f"/api/workspace/items/{item_id}",
            json={"status": "done", "version": 1},
        )
        assert patch_res.status_code == 200
        updated = patch_res.json()
        assert updated["status"] == "done"
        assert updated["version"] == 2

        # Stale version patch should return 409
        stale_res = client.patch(
            f"/api/workspace/items/{item_id}",
            json={"status": "open", "version": 1},
        )
        assert stale_res.status_code == 409

        # Delete item
        del_res = client.delete(f"/api/workspace/items/{item_id}")
        assert del_res.status_code == 200

    def test_daily_review_endpoint(self, client):
        # Create a task and workspace item
        client.post("/api/tasks", json={"title": "Daily Review Task", "priority": "high"})
        client.post("/api/workspace/items", json={"category": "finance", "title": "Audit subscriptions"})

        r = client.get("/api/review/today")
        assert r.status_code == 200
        data = r.json()
        for k in ["date", "open_tasks", "open_modules", "completed_tasks", "next_actions", "generated_locally"]:
            assert k in data, f"missing {k} in daily review"
        assert data["generated_locally"] is True
        assert len(data["next_actions"]) >= 1

    def test_tasks_paginated_format_and_versioning(self, client):
        created = client.post("/api/tasks", json={"title": "Hardened Task Line Item", "priority": "medium"}).json()
        tid = created["id"]
        assert created.get("completed") is False
        assert created.get("version") == 1

        # Query with limit returns { items, total, offset, limit }
        page = client.get("/api/tasks?limit=20&offset=0").json()
        assert isinstance(page, dict)
        assert "items" in page
        assert page["total"] >= 1

        # Toggle completed
        patched = client.patch(f"/api/tasks/{tid}", json={"completed": True, "version": 1}).json()
        assert patched["completed"] is True
        assert patched["status"] == "done"
        assert patched["version"] == 2

        # Delete
        client.delete(f"/api/tasks/{tid}")

