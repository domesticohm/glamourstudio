"""
main.py — GlamourStudio API (Gemini edition)
--------------------------------------------
POST /api/generate       → upload photo, start async generation job
GET  /api/status/{id}    → poll job status / progress
GET  /api/result/{id}    → stream the generated PNG
"""
from __future__ import annotations

import io
import logging
import threading
import uuid
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from pydantic import BaseModel

from gemini_pipeline import generate_portrait, image_to_bytes

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="GlamourStudio API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Job store ────────────────────────────────────────────────────────────────
_jobs: dict[str, dict] = {}
_lock = threading.Lock()


def _new_job() -> str:
    jid = str(uuid.uuid4())
    with _lock:
        _jobs[jid] = {
            "status": "queued",
            "progress": 0,
            "message": "Queued",
            "result_bytes": None,
            "error": None,
        }
    return jid


def _update_job(jid: str, **kw):
    with _lock:
        _jobs[jid].update(kw)


# ─── Models ───────────────────────────────────────────────────────────────────

class JobStatus(BaseModel):
    job_id:   str
    status:   str
    progress: int
    message:  str
    error:    Optional[str] = None


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"ok": True}


def _run_generation(jid: str, photo: Image.Image, vibe: str):
    """Background thread: run 3-phase Gemini pipeline."""
    try:
        _update_job(jid, status="running", progress=10, message="Starting…")

        def cb(stage: str, pct: int):
            _update_job(jid, progress=pct, message=stage)

        portrait = generate_portrait(photo, vibe=vibe, progress_cb=cb)

        _update_job(jid, progress=98, message="Encoding image…")
        result_bytes = image_to_bytes(portrait, fmt="PNG")
        _update_job(
            jid,
            status="done",
            progress=100,
            message="Done!",
            result_bytes=result_bytes,
        )

    except Exception as exc:
        logger.exception("Generation failed for job %s", jid)
        _update_job(jid, status="error", progress=0, message="Error", error=str(exc))


@app.post("/api/generate")
async def generate_endpoint(
    file: UploadFile = File(...),
    vibe: str = Form("glamour"),
):
    """Upload a photo and start an async generation job."""
    raw = await file.read()
    try:
        photo = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(400, f"Cannot read image: {exc}")

    jid = _new_job()
    t = threading.Thread(target=_run_generation, args=(jid, photo, vibe), daemon=True)
    t.start()
    return {"job_id": jid}


@app.get("/api/status/{job_id}", response_model=JobStatus)
def status_endpoint(job_id: str):
    with _lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    return JobStatus(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        message=job["message"],
        error=job["error"],
    )


@app.get("/api/result/{job_id}")
def result_endpoint(job_id: str):
    with _lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    if job["status"] != "done":
        raise HTTPException(409, "Job not finished yet.")
    if not job["result_bytes"]:
        raise HTTPException(500, "Result missing.")
    return Response(
        content=job["result_bytes"],
        media_type="image/png",
        headers={"Content-Disposition": 'attachment; filename="glamour_portrait.png"'},
    )
