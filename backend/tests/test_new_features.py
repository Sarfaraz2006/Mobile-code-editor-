"""Backend API tests for the iteration-2 additions.

Covers:
- /api/terminal/exec    session persistence, denylist
- /api/terminal/reset   discards session
- /api/github/import    real public repo + invalid URL
- /api/format           python (black), js (prettier), unknown language
- regression: /api/run, /api/backup still work
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


# ---------- Terminal ----------
class TestTerminal:
    session_id = f"TEST_term_{uuid.uuid4().hex[:8]}"

    def test_echo(self, api):
        r = api.post(
            f"{BASE_URL}/api/terminal/exec",
            json={"session_id": self.session_id, "command": "echo hello"},
            timeout=25,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["stdout"].strip() == "hello"
        assert d["exit_code"] == 0
        assert d["timed_out"] is False
        assert d.get("cwd", "").startswith("/tmp/") or "/tmp" in d.get("cwd", "")

    def test_pwd_is_session_tempdir(self, api):
        r = api.post(
            f"{BASE_URL}/api/terminal/exec",
            json={"session_id": self.session_id, "command": "pwd"},
            timeout=25,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["exit_code"] == 0
        out = d["stdout"].strip()
        # pwd should equal cwd returned in response
        assert out == d["cwd"], (out, d["cwd"])
        assert "cc-term-" in out

    def test_session_persists_files(self, api):
        r1 = api.post(
            f"{BASE_URL}/api/terminal/exec",
            json={"session_id": self.session_id, "command": "echo persistent > f.txt"},
            timeout=25,
        )
        assert r1.status_code == 200
        assert r1.json()["exit_code"] == 0

        r2 = api.post(
            f"{BASE_URL}/api/terminal/exec",
            json={"session_id": self.session_id, "command": "cat f.txt"},
            timeout=25,
        )
        assert r2.status_code == 200
        d = r2.json()
        assert d["exit_code"] == 0
        assert d["stdout"].strip() == "persistent"

    def test_empty_command(self, api):
        r = api.post(
            f"{BASE_URL}/api/terminal/exec",
            json={"session_id": self.session_id, "command": "   "},
            timeout=15,
        )
        assert r.status_code == 400

    def test_dangerous_command_blocked(self, api):
        r = api.post(
            f"{BASE_URL}/api/terminal/exec",
            json={"session_id": self.session_id, "command": "rm -rf /"},
            timeout=15,
        )
        assert r.status_code == 400
        assert "blocked" in r.json().get("detail", "").lower()

    def test_reset_clears_session(self, api):
        # write a marker
        api.post(
            f"{BASE_URL}/api/terminal/exec",
            json={"session_id": self.session_id, "command": "echo marker > m.txt"},
            timeout=25,
        )
        # reset
        r = api.post(
            f"{BASE_URL}/api/terminal/reset",
            json={"session_id": self.session_id, "command": "noop"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # new exec should get a fresh tempdir where m.txt does not exist
        r2 = api.post(
            f"{BASE_URL}/api/terminal/exec",
            json={"session_id": self.session_id, "command": "ls"},
            timeout=25,
        )
        assert r2.status_code == 200
        d = r2.json()
        assert "m.txt" not in d["stdout"]


# ---------- GitHub import ----------
class TestGithubImport:
    def test_import_hello_world(self, api):
        r = api.post(
            f"{BASE_URL}/api/github/import",
            json={"url": "https://github.com/octocat/Hello-World"},
            timeout=45,
        )
        # skip if rate-limited
        if r.status_code == 400 and "rate limit" in r.text.lower():
            pytest.skip("GitHub rate limit hit")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["repo"] == "octocat/Hello-World"
        assert d["file_count"] >= 1
        paths = [f["path"] for f in d["files"]]
        # README should be captured (case-insensitive match)
        assert any(p.lower().startswith("readme") for p in paths), paths
        # README content contains 'Hello World' (canonical repo)
        readme = next(
            f for f in d["files"] if f["path"].lower().startswith("readme")
        )
        assert "Hello World" in readme["content"]

    def test_invalid_url(self, api):
        r = api.post(
            f"{BASE_URL}/api/github/import",
            json={"url": "not-a-github-url"},
            timeout=15,
        )
        assert r.status_code == 400
        assert "Invalid GitHub URL" in r.json().get("detail", "")


# ---------- Format ----------
class TestFormat:
    def test_python_black(self, api):
        r = api.post(
            f"{BASE_URL}/api/format",
            json={"code": "def f(x): return   x+1\n", "language": "python"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["error"] in (None, ""), d
        assert d["changed"] is True
        # black produces `def f(x):\n    return x + 1\n`
        assert "def f(x):" in d["formatted"]
        assert "return x + 1" in d["formatted"]

    def test_javascript_prettier(self, api):
        messy = "const a  =   1;function foo( x ){return x+1}\n"
        r = api.post(
            f"{BASE_URL}/api/format",
            json={"code": messy, "language": "javascript"},
            timeout=25,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["error"] in (None, ""), d
        assert d["changed"] is True
        assert "const a = 1" in d["formatted"]
        assert "return x + 1" in d["formatted"]

    def test_unknown_language_no_crash(self, api):
        r = api.post(
            f"{BASE_URL}/api/format",
            json={"code": "puts 1", "language": "ruby"},
            timeout=15,
        )
        # server should return 200 with error, not 500
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["changed"] is False
        assert d["error"] and "ruby" in d["error"].lower()
        assert d["formatted"] == "puts 1"


# ---------- Regression ----------
class TestRegression:
    def test_run_python_still_works(self, api):
        r = api.post(
            f"{BASE_URL}/api/run",
            json={"code": "print('regress')", "language": "python"},
            timeout=25,
        )
        assert r.status_code == 200
        assert r.json()["stdout"].strip() == "regress"

    def test_backup_still_works(self, api):
        dev = f"TEST_reg_{uuid.uuid4().hex[:8]}"
        r = api.post(
            f"{BASE_URL}/api/backup",
            json={"path": "TEST_r.txt", "content": "x", "device_id": dev},
            timeout=15,
        )
        assert r.status_code == 200
        r2 = api.get(f"{BASE_URL}/api/backup/{dev}", timeout=15)
        assert r2.status_code == 200
        arr = r2.json()
        assert any(d["path"] == "TEST_r.txt" for d in arr)
