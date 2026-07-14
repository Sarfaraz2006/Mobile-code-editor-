from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import tempfile
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EXEC_TIMEOUT = 10  # seconds


class RunRequest(BaseModel):
    code: str
    language: str  # python | javascript | node


class RunResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int
    timed_out: bool = False


async def _run_subprocess(cmd: list, code: str, ext: str) -> RunResponse:
    """Write code to a temp file and execute via subprocess with a timeout."""
    started = datetime.now(timezone.utc)
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=f".{ext}", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(code)
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
                proc.communicate(), timeout=EXEC_TIMEOUT
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
                + ("\n[Execution timed out after %ss]" % EXEC_TIMEOUT if timed_out else "")
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
    raise HTTPException(
        status_code=400,
        detail=f"Unsupported language: {payload.language}. Use 'python' or 'javascript'.",
    )


@api_router.get("/languages")
async def get_languages():
    """List server-executable languages."""
    return {
        "executable": [
            {"id": "python", "label": "Python 3"},
            {"id": "javascript", "label": "JavaScript (Node)"},
        ]
    }


# Simple file backup endpoints (for future cloud sync). Files stay on device
# unless the user explicitly uploads them via these endpoints.
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
