from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import tempfile
import shutil
import base64
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime, timezone
import requests
import pty
import fcntl
import termios
import struct
import subprocess


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'mobile_editor')

class MockCollection:
    def __init__(self):
        self.backups = {}
    async def replace_one(self, filter_query, doc, upsert=True):
        device_id = filter_query.get("device_id")
        path = filter_query.get("path")
        key = f"{device_id}:{path}"
        self.backups[key] = doc
        return doc
    def find(self, filter_query, projection=None):
        device_id = filter_query.get("device_id")
        results = [v for k, v in self.backups.items() if k.startswith(f"{device_id}:")]
        class MockCursor:
            async def to_list(self, length):
                return results
        return MockCursor()

class MockDB:
    def __init__(self):
        self.file_backups = MockCollection()

if mongo_url:
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
    except Exception:
        db = MockDB()
else:
    db = MockDB()


app = FastAPI()

class PTYSession:
    def __init__(self, session_id: str, cwd: str):
        self.session_id = session_id
        self.cwd = cwd
        self.master_fd = None
        self.slave_fd = None
        self.proc = None

    def start(self):
        self.master_fd, self.slave_fd = pty.openpty()
        
        # Set non-blocking on master_fd
        flags = fcntl.fcntl(self.master_fd, fcntl.F_GETFL)
        fcntl.fcntl(self.master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
        
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"
        
        shell = "bash"
        if shutil.which("bash") is None:
            shell = "sh"

        self.proc = subprocess.Popen(
            [shell],
            preexec_fn=os.setsid,
            stdin=self.slave_fd,
            stdout=self.slave_fd,
            stderr=self.slave_fd,
            cwd=self.cwd,
            env=env
        )
        # Close slave_fd in parent process as Popen has duplicated it
        os.close(self.slave_fd)
        self.slave_fd = None

    async def run_read_loop(self, websocket: WebSocket):
        try:
            while True:
                if self.proc and self.proc.poll() is not None:
                    break
                try:
                    data = os.read(self.master_fd, 4096)
                    if not data:
                        break
                    await websocket.send_json({
                        "type": "data",
                        "data": data.decode("utf-8", errors="replace")
                    })
                except BlockingIOError:
                    await asyncio.sleep(0.01)
                except Exception:
                    break
        except Exception:
            pass
        finally:
            self.close()

    def write(self, data: str):
        if self.master_fd is not None:
            try:
                os.write(self.master_fd, data.encode("utf-8"))
            except Exception:
                pass

    def resize(self, cols: int, rows: int):
        if self.master_fd is not None:
            try:
                size = struct.pack("HHHH", rows, cols, 0, 0)
                fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, size)
            except Exception:
                pass

    def close(self):
        if self.proc:
            try:
                self.proc.terminate()
            except Exception:
                pass
            self.proc = None
        if self.master_fd is not None:
            try:
                os.close(self.master_fd)
            except Exception:
                pass
            self.master_fd = None


ACTIVE_PTY_SESSIONS: dict[str, PTYSession] = {}


@app.websocket("/api/terminal/ws/{session_id}")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    cwd = _repo_dir(session_id)
    
    # Clean up previous session if any
    if session_id in ACTIVE_PTY_SESSIONS:
        try:
            ACTIVE_PTY_SESSIONS[session_id].close()
        except Exception:
            pass
            
    session = PTYSession(session_id, cwd)
    try:
        session.start()
    except Exception as e:
        await websocket.send_json({"type": "data", "data": f"Failed to start terminal: {str(e)}\r\n"})
        await websocket.close()
        return

    ACTIVE_PTY_SESSIONS[session_id] = session
    
    read_task = asyncio.create_task(session.run_read_loop(websocket))
    
    try:
        while True:
            msg = await websocket.receive_json()
            mtype = msg.get("type")
            if mtype == "input":
                session.write(msg.get("data", ""))
            elif mtype == "resize":
                cols = msg.get("cols", 80)
                rows = msg.get("rows", 24)
                session.resize(cols, rows)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        read_task.cancel()
        session.close()
        ACTIVE_PTY_SESSIONS.pop(session_id, None)


api_router = APIRouter(prefix="/api")

EXEC_TIMEOUT = 15
TERMINAL_TIMEOUT = 300
PRETTIER_BIN = "/tmp/formatters/node_modules/.bin/prettier"

# ------------------- Models -------------------


class RunRequest(BaseModel):
    code: str
    language: str


class RunResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int
    timed_out: bool = False


class TerminalRequest(BaseModel):
    command: str
    cwd: Optional[str] = None  # ignored – all runs in an isolated tmpdir


class GithubImportRequest(BaseModel):
    url: str  # e.g. https://github.com/user/repo or with /tree/branch/path


class GithubFile(BaseModel):
    path: str
    content: str  # UTF-8 text; binaries are skipped
    is_binary: bool = False


class GithubImportResponse(BaseModel):
    repo: str
    branch: str
    root_path: str
    file_count: int
    files: List[GithubFile]
    skipped_binary: int
    truncated: bool


class FormatRequest(BaseModel):
    code: str
    language: str
    filename: Optional[str] = None


class FormatResponse(BaseModel):
    formatted: str
    changed: bool
    error: Optional[str] = None


# ------------------- Helpers -------------------


async def _run_subprocess(
    cmd: list, code_or_stdin: str, ext: str, timeout: int = EXEC_TIMEOUT
) -> RunResponse:
    started = datetime.now(timezone.utc)
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=f".{ext}", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(code_or_stdin)
        tmp_path = tmp.name
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            tmp_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        timed_out = False
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=timeout
            )
        except asyncio.TimeoutError:
            timed_out = True
            try:
                proc.kill()
            except ProcessLookupError:
                pass
            stdout, stderr = await proc.communicate()

        duration = int(
            (datetime.now(timezone.utc) - started).total_seconds() * 1000
        )
        return RunResponse(
            stdout=stdout.decode("utf-8", errors="replace"),
            stderr=(
                stderr.decode("utf-8", errors="replace")
                + ("\n[Execution timed out after %ss]" % timeout if timed_out else "")
            ),
            exit_code=proc.returncode if proc.returncode is not None else -1,
            duration_ms=duration,
            timed_out=timed_out,
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


async def _run_shell(cmd_str: str, cwd: str, timeout: int) -> RunResponse:
    started = datetime.now(timezone.utc)
    proc = await asyncio.create_subprocess_shell(
        cmd_str,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=cwd,
    )
    timed_out = False
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        timed_out = True
        try:
            proc.kill()
        except ProcessLookupError:
            pass
        stdout, stderr = await proc.communicate()
    duration = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
    return RunResponse(
        stdout=stdout.decode("utf-8", errors="replace"),
        stderr=(
            stderr.decode("utf-8", errors="replace")
            + ("\n[Command timed out after %ss]" % timeout if timed_out else "")
        ),
        exit_code=proc.returncode if proc.returncode is not None else -1,
        duration_ms=duration,
        timed_out=timed_out,
    )


# ------------------- Routes -------------------


@api_router.get("/")
async def root():
    return {"message": "Mobile Code Editor API", "status": "ok"}


@api_router.post("/run", response_model=RunResponse)
async def run_code(payload: RunRequest):
    lang = payload.language.lower().strip()
    if lang == "python":
        return await _run_subprocess(["python3", "-I"], payload.code, "py")
    if lang in ("javascript", "node", "js"):
        return await _run_subprocess(["node"], payload.code, "js")
    raise HTTPException(status_code=400, detail=f"Unsupported language: {payload.language}.")


@api_router.get("/languages")
async def get_languages():
    return {
        "executable": [
            {"id": "python", "label": "Python 3"},
            {"id": "javascript", "label": "JavaScript (Node)"},
        ]
    }


# ---- Interactive terminal ----
# Per-session tempdirs keep sandbox state (installed packages via `pip install --user`,
# created files, etc.) between commands.
TERMINAL_SESSIONS: dict[str, str] = {}


def _get_session_dir(session_id: str) -> str:
    return _repo_dir(session_id)


class TerminalExecRequest(BaseModel):
    session_id: str
    command: str


class TerminalExecResponse(RunResponse):
    cwd: str


@api_router.post("/terminal/exec", response_model=TerminalExecResponse)
async def terminal_exec(payload: TerminalExecRequest):
    if not payload.command.strip():
        raise HTTPException(status_code=400, detail="Empty command")
    # Very basic denylist – we run in a Kubernetes container but still don't
    # want obvious foot-guns from the phone client.
    lowered = payload.command.strip().lower()
    for banned in ("rm -rf /", ":(){:|:&};:", "mkfs", "dd if=/dev/zero"):
        if banned in lowered:
            raise HTTPException(status_code=400, detail=f"Command blocked: {banned}")
    cwd = _get_session_dir(payload.session_id)
    result = await _run_shell(payload.command, cwd, TERMINAL_TIMEOUT)
    return TerminalExecResponse(**result.dict(), cwd=cwd)


@api_router.post("/terminal/reset")
async def terminal_reset(payload: TerminalExecRequest):
    """Discard the session's working directory and start fresh."""
    cwd = TERMINAL_SESSIONS.pop(payload.session_id, None)
    if cwd and os.path.isdir(cwd):
        try:
            await asyncio.create_subprocess_exec("rm", "-rf", cwd)
        except Exception:
            pass
    return {"ok": True}


# ---- GitHub import ----
_GITHUB_URL_RE = re.compile(
    r"^https?://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?/?(?:/tree/(?P<branch>[^/]+)(?:/(?P<path>.*))?)?/?$"
)
_TEXT_EXTENSIONS = {
    ".txt", ".md", ".markdown", ".json", ".xml", ".yaml", ".yml", ".toml",
    ".ini", ".cfg", ".conf", ".env", ".gitignore", ".editorconfig",
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".py", ".rb", ".php", ".go", ".rs", ".java", ".kt", ".swift",
    ".c", ".cc", ".cpp", ".h", ".hpp", ".cs", ".m",
    ".html", ".htm", ".css", ".scss", ".sass", ".less",
    ".sql", ".sh", ".bash", ".zsh", ".fish", ".ps1",
    ".vue", ".svelte", ".dart", ".ex", ".exs", ".lua", ".r",
    ".dockerfile", ".makefile", ".log",
}
MAX_GITHUB_FILES = 300
MAX_GITHUB_FILE_BYTES = 512 * 1024  # 512 KB per file


def _is_text_file(path: str) -> bool:
    lower = path.lower()
    if any(lower.endswith(ext) for ext in _TEXT_EXTENSIONS):
        return True
    name = os.path.basename(lower)
    if name in ("dockerfile", "makefile", "license", "readme", "changelog"):
        return True
    return False


def _parse_github_url(url: str):
    m = _GITHUB_URL_RE.match(url.strip())
    if not m:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL")
    owner = m.group("owner")
    repo = m.group("repo")
    branch = m.group("branch")
    path = m.group("path") or ""
    return owner, repo, branch, path


@api_router.post("/github/import", response_model=GithubImportResponse)
async def github_import(payload: GithubImportRequest):
    owner, repo, branch, sub_path = _parse_github_url(payload.url)
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "CodeCraft"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    if not branch:
        # Resolve default branch
        r = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}", headers=headers, timeout=10
        )
        if r.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Repo not found or private: {owner}/{repo} ({r.status_code})",
            )
        branch = r.json().get("default_branch", "main")

    # Get full tree
    tree_r = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
        headers=headers,
        timeout=15,
    )
    if tree_r.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Could not read tree: {tree_r.text[:200]}")
    tree_data = tree_r.json()
    entries = tree_data.get("tree", [])
    truncated = bool(tree_data.get("truncated"))

    files: List[GithubFile] = []
    skipped_binary = 0
    for entry in entries:
        if entry.get("type") != "blob":
            continue
        path = entry.get("path", "")
        if sub_path and not path.startswith(sub_path):
            continue
        rel = path[len(sub_path):].lstrip("/") if sub_path else path
        if not rel:
            continue
        if not _is_text_file(rel):
            skipped_binary += 1
            continue
        size = entry.get("size", 0) or 0
        if size > MAX_GITHUB_FILE_BYTES:
            skipped_binary += 1
            continue
        # Fetch blob
        blob_r = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/blobs/{entry['sha']}",
            headers=headers,
            timeout=15,
        )
        if blob_r.status_code != 200:
            continue
        blob = blob_r.json()
        encoding = blob.get("encoding", "base64")
        content = ""
        if encoding == "base64":
            try:
                raw = base64.b64decode(blob.get("content", ""))
                content = raw.decode("utf-8", errors="replace")
            except Exception:
                skipped_binary += 1
                continue
        else:
            content = blob.get("content", "")
        files.append(GithubFile(path=rel, content=content))
        if len(files) >= MAX_GITHUB_FILES:
            truncated = True
            break

    return GithubImportResponse(
        repo=f"{owner}/{repo}",
        branch=branch,
        root_path=sub_path,
        file_count=len(files),
        files=files,
        skipped_binary=skipped_binary,
        truncated=truncated,
    )


# ---- Code formatting ----
@api_router.post("/format", response_model=FormatResponse)
async def format_code(payload: FormatRequest):
    lang = payload.language.lower().strip()
    original = payload.code
    if lang == "python":
        try:
            import black
            mode = black.Mode()
            formatted = black.format_str(original, mode=mode)
            return FormatResponse(
                formatted=formatted, changed=formatted != original
            )
        except Exception as e:
            return FormatResponse(formatted=original, changed=False, error=str(e)[:400])
    if lang in ("javascript", "js", "jsx", "typescript", "ts", "tsx", "json", "css", "scss", "html", "markdown", "md", "yaml", "yml"):
        parser_map = {
            "js": "babel", "javascript": "babel", "jsx": "babel",
            "ts": "typescript", "typescript": "typescript", "tsx": "typescript",
            "json": "json", "css": "css", "scss": "scss",
            "html": "html", "markdown": "markdown", "md": "markdown",
            "yaml": "yaml", "yml": "yaml",
        }
        parser = parser_map[lang]
        # Write to a temp file so prettier picks the right parser via --parser.
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as tmp:
            tmp.write(original)
            tmp_path = tmp.name
        try:
            proc = await asyncio.create_subprocess_exec(
                PRETTIER_BIN, "--parser", parser, tmp_path,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10)
            except asyncio.TimeoutError:
                proc.kill()
                return FormatResponse(formatted=original, changed=False, error="Formatter timed out")
            if proc.returncode != 0:
                return FormatResponse(
                    formatted=original, changed=False, error=stderr.decode("utf-8", errors="replace")[:400]
                )
            formatted = stdout.decode("utf-8", errors="replace")
            return FormatResponse(formatted=formatted, changed=formatted != original)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    return FormatResponse(
        formatted=original, changed=False, error=f"No formatter for language: {lang}"
    )


# ---- Git operations ----
class GitRequest(BaseModel):
    session_id: str
    args: Optional[List[str]] = None
    message: Optional[str] = None
    remote_url: Optional[str] = None
    branch: Optional[str] = None
    files: Optional[List[dict]] = None  # [{path, content}] – write into repo


def _repo_dir(session_id: str) -> str:
    d = os.path.join(tempfile.gettempdir(), f"cc-repo-{session_id[:16]}")
    os.makedirs(d, exist_ok=True)
    return d


async def _git(cwd: str, *args: str) -> RunResponse:
    return await _run_shell(
        "git " + " ".join([f"'{a}'" for a in args]), cwd, 20
    )


@api_router.post("/git/init")
async def git_init(payload: GitRequest):
    cwd = _repo_dir(payload.session_id)
    if not os.path.isdir(os.path.join(cwd, ".git")):
        r = await _git(cwd, "init", "-b", "main")
    else:
        r = RunResponse(stdout="Reinitialized existing git repository\n", stderr="", exit_code=0, duration_ms=0)
    # Ensure user identity for commits
    await _git(cwd, "config", "user.email", "codecraft@mobile.local")
    await _git(cwd, "config", "user.name", "CodeCraft User")
    return {**r.dict(), "cwd": cwd}


@api_router.post("/git/write")
async def git_write(payload: GitRequest):
    """Sync client files into the repo working tree (called before status/commit)."""
    cwd = _repo_dir(payload.session_id)
    written = 0
    if payload.files:
        for f in payload.files:
            rel = f.get("path")
            content = f.get("content", "")
            if not rel:
                continue
            abs_path = os.path.join(cwd, rel)
            parent = os.path.dirname(abs_path)
            if parent:
                os.makedirs(parent, exist_ok=True)
            with open(abs_path, "w", encoding="utf-8") as fh:
                fh.write(content)
            written += 1
    return {"cwd": cwd, "written": written}


@api_router.post("/git/status")
async def git_status(payload: GitRequest):
    cwd = _repo_dir(payload.session_id)
    r = await _git(cwd, "status", "--porcelain=v1", "-b")
    return {**r.dict(), "cwd": cwd}


@api_router.post("/git/add")
async def git_add(payload: GitRequest):
    cwd = _repo_dir(payload.session_id)
    args = payload.args or ["."]
    r = await _git(cwd, "add", *args)
    return {**r.dict(), "cwd": cwd}


@api_router.post("/git/commit")
async def git_commit(payload: GitRequest):
    cwd = _repo_dir(payload.session_id)
    msg = (payload.message or "").strip() or "update"
    r = await _git(cwd, "commit", "-m", msg)
    return {**r.dict(), "cwd": cwd}


@api_router.post("/git/log")
async def git_log(payload: GitRequest):
    cwd = _repo_dir(payload.session_id)
    r = await _git(
        cwd, "log", "--pretty=format:%h %ad %s", "--date=short", "-n", "30"
    )
    return {**r.dict(), "cwd": cwd}


@api_router.post("/git/remote")
async def git_remote(payload: GitRequest):
    cwd = _repo_dir(payload.session_id)
    if payload.remote_url:
        # Set or replace origin
        await _git(cwd, "remote", "remove", "origin")
        r = await _git(cwd, "remote", "add", "origin", payload.remote_url)
        return {**r.dict(), "cwd": cwd, "origin": payload.remote_url}
    r = await _git(cwd, "remote", "-v")
    return {**r.dict(), "cwd": cwd}


@api_router.post("/git/push")
async def git_push(payload: GitRequest):
    cwd = _repo_dir(payload.session_id)
    branch = payload.branch or "main"
    r = await _git(cwd, "push", "-u", "origin", branch)
    return {**r.dict(), "cwd": cwd}


@api_router.post("/git/pull")
async def git_pull(payload: GitRequest):
    cwd = _repo_dir(payload.session_id)
    r = await _git(cwd, "pull", "--ff-only", "origin", payload.branch or "main")
    return {**r.dict(), "cwd": cwd}



class FileBackup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    path: str
    content: str
    device_id: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FileBackupCreate(BaseModel):
    path: str
    content: str
    device_id: str


@api_router.post("/backup", response_model=FileBackup)
async def backup_file(payload: FileBackupCreate):
    doc = FileBackup(**payload.dict())
    await db.file_backups.replace_one(
        {"device_id": doc.device_id, "path": doc.path},
        doc.dict(),
        upsert=True,
    )
    return doc


@api_router.get("/backup/{device_id}")
async def list_backups(device_id: str):
    cursor = db.file_backups.find({"device_id": device_id}, {"_id": 0})
    return await cursor.to_list(1000)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
