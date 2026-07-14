"""Backend API tests for CodeCraft mobile code editor.

Covers:
- GET /api/           health
- POST /api/run       python / js execution, error handling, timeouts, bad language
- GET /api/languages  supported languages list
- POST /api/backup + GET /api/backup/{device_id}  cloud file backup
"""

import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get(
    "EXPO_BACKEND_URL"
)
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
class TestHealth:
    def test_root_ok(self, api):
        r = api.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("status") == "ok"
        assert "Mobile Code Editor" in body.get("message", "")


# ---------- Languages ----------
class TestLanguages:
    def test_languages_list(self, api):
        r = api.get(f"{BASE_URL}/api/languages", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "executable" in data
        ids = {row["id"] for row in data["executable"]}
        assert {"python", "javascript"}.issubset(ids)


# ---------- Run ----------
class TestRunPython:
    def test_python_stdout(self, api):
        r = api.post(
            f"{BASE_URL}/api/run",
            json={"code": "print(2+3)", "language": "python"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["stdout"].strip() == "5"
        assert d["exit_code"] == 0
        assert d["timed_out"] is False

    def test_python_multi_line(self, api):
        code = "for i in range(3):\n    print(i)\n"
        r = api.post(
            f"{BASE_URL}/api/run",
            json={"code": code, "language": "python"},
            timeout=30,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["stdout"].splitlines() == ["0", "1", "2"]
        assert d["exit_code"] == 0

    def test_python_runtime_error(self, api):
        r = api.post(
            f"{BASE_URL}/api/run",
            json={"code": "raise ValueError('boom')", "language": "python"},
            timeout=30,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["exit_code"] != 0
        assert "ValueError" in d["stderr"]
        assert d["timed_out"] is False

    def test_python_timeout(self, api):
        # EXEC_TIMEOUT is 10s; give client 25s so we can observe the timed_out flag
        r = api.post(
            f"{BASE_URL}/api/run",
            json={"code": "while True: pass", "language": "python"},
            timeout=25,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["timed_out"] is True
        assert "timed out" in d["stderr"].lower()


class TestRunJavaScript:
    def test_js_stdout(self, api):
        r = api.post(
            f"{BASE_URL}/api/run",
            json={"code": "console.log(2+3)", "language": "javascript"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["stdout"].strip() == "5"
        assert d["exit_code"] == 0

    def test_js_alias_node(self, api):
        r = api.post(
            f"{BASE_URL}/api/run",
            json={"code": "console.log('hi')", "language": "node"},
            timeout=30,
        )
        assert r.status_code == 200
        assert r.json()["stdout"].strip() == "hi"


class TestRunErrors:
    def test_unsupported_language(self, api):
        r = api.post(
            f"{BASE_URL}/api/run",
            json={"code": "puts 1", "language": "ruby"},
            timeout=15,
        )
        assert r.status_code == 400
        assert "Unsupported" in r.json().get("detail", "")


# ---------- Backup ----------
class TestBackup:
    device = f"TEST_dev_{uuid.uuid4().hex[:8]}"

    def test_create_and_fetch(self, api):
        path = "TEST_notes.txt"
        content = "hello backup"
        r = api.post(
            f"{BASE_URL}/api/backup",
            json={"path": path, "content": content, "device_id": self.device},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["path"] == path
        assert doc["content"] == content
        assert doc["device_id"] == self.device
        assert "id" in doc

        # GET verifies persistence
        r2 = api.get(f"{BASE_URL}/api/backup/{self.device}", timeout=15)
        assert r2.status_code == 200, r2.text
        arr = r2.json()
        assert isinstance(arr, list)
        matched = [d for d in arr if d["path"] == path]
        assert matched, f"backup not persisted; got {arr}"
        assert matched[0]["content"] == content
        # ensure Mongo _id is not leaked
        assert "_id" not in matched[0]

    def test_upsert_replaces(self, api):
        path = "TEST_notes.txt"
        r = api.post(
            f"{BASE_URL}/api/backup",
            json={"path": path, "content": "v2", "device_id": self.device},
            timeout=15,
        )
        assert r.status_code == 200
        r2 = api.get(f"{BASE_URL}/api/backup/{self.device}", timeout=15)
        arr = r2.json()
        matches = [d for d in arr if d["path"] == path]
        # upsert => still exactly one row for (device, path)
        assert len(matches) == 1
        assert matches[0]["content"] == "v2"
