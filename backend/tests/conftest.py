"""Pytest configuration and self-contained fixtures for LifeOS backend testing."""
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

# Set test environment flags
os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["DB_NAME"] = "test_lifeos"
os.environ["JWT_SECRET"] = "test_secret_for_unit_tests_12345"
os.environ["EMERGENT_LLM_KEY"] = ""

from backend.server import app
from backend import database


@pytest.fixture(scope="function")
def mock_db():
    """Create a fresh in-memory mock MongoDB database for each test."""
    mock_client = AsyncMongoMockClient()
    test_db = mock_client["test_lifeos"]
    orig_db = database.db
    database.db = test_db
    yield test_db
    database.db = orig_db


@pytest.fixture(scope="function")
def api_client(mock_db):
    """Create a self-contained in-process FastAPI TestClient."""
    with TestClient(app, base_url="http://testserver") as client:
        yield client


@pytest.fixture(scope="function")
def test_user(mock_db, api_client):
    """Create a fresh throwaway test user and return credentials + token."""
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = os.environ.get("TEST_USER_PASSWORD", "Test_Fixture_Pass_123!")
    r = api_client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Test User"},
    )
    assert r.status_code == 200, f"Register failed: {r.text}"
    data = r.json()
    return {
        "id": data["id"],
        "email": email,
        "password": password,
        "name": data.get("name", "Test User"),
        "token": data["token"],
    }


@pytest.fixture(scope="function")
def client(api_client, test_user):
    """Authenticated client pre-configured with Bearer token header and cookies."""
    api_client.headers.update(
        {
            "Authorization": f"Bearer {test_user['token']}",
            "Content-Type": "application/json",
        }
    )
    api_client.cookies.set("access_token", test_user["token"])
    return api_client
