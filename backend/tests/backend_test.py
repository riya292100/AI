import os
import uuid

import pytest
import requests


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://agent-forge-302.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def client():
    with requests.Session() as session:
        session.headers.update({"Content-Type": "application/json"})
        yield session


def test_root_and_workspace(client):
    root = client.get(f"{BASE_URL}/api/", timeout=15)
    assert root.status_code == 200
    assert root.json()["message"] == "NexusAI workspace online"
    workspace = client.get(f"{BASE_URL}/api/workspace", timeout=15)
    assert workspace.status_code == 200
    assert all(key in workspace.json() for key in ("tasks", "notes", "messages", "activity"))


def test_task_create_toggle_and_persist(client):
    title = f"TEST_{uuid.uuid4()}"
    created = client.post(f"{BASE_URL}/api/tasks", json={"title": title, "priority": "low"}, timeout=15)
    assert created.status_code == 200
    task = created.json()
    assert task["title"] == title and task["status"] == "queued"
    updated = client.patch(f"{BASE_URL}/api/tasks/{task['id']}", json={"status": "done"}, timeout=15)
    assert updated.status_code == 200
    workspace = client.get(f"{BASE_URL}/api/workspace", timeout=15).json()
    persisted = next(item for item in workspace["tasks"] if item["id"] == task["id"])
    assert persisted["status"] == "done"


def test_chat_validation_and_stream(client):
    invalid = client.post(f"{BASE_URL}/api/chat/stream", json={"message": "   "}, timeout=15)
    assert invalid.status_code == 400
    response = client.post(f"{BASE_URL}/api/chat/stream", json={"message": "TEST reply briefly"}, timeout=90)
    assert response.status_code == 200
    assert "data:" in response.text
    assert any(marker in response.text for marker in ('"type": "done"', '"type":"done"'))
    workspace = client.get(f"{BASE_URL}/api/workspace", timeout=15).json()
    assert any(message["content"] == "TEST reply briefly" for message in workspace["messages"])