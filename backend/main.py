from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from db import init_db
from seed import seed_tasks
from storage import ensure_bucket
from routers import admin, portal, files

DIST = Path(__file__).parent.parent / "frontend" / "dist"

app = FastAPI(docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

# Routers
app.include_router(admin.router)
app.include_router(portal.router)
app.include_router(files.router)


@app.get("/api/me")
async def api_me(request: Request):
    """SSO removed for demo — all visitors are treated as internal_admin."""
    return {
        "sub": "demo-admin",
        "preferred_username": "admin",
        "email": "admin@123dentist.com",
        "name": "123Dentist Admin",
        "role": "internal_admin",
    }


# ── Static Frontend ───────────────────────────────────────────────────────────

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str, request: Request):
    if full_path.startswith("api"):
        from fastapi import HTTPException

        raise HTTPException(status_code=404)
    if DIST.exists():
        return FileResponse(str(DIST / "index.html"))
    return {
        "message": "Frontend not built yet. Run: cd frontend && npm install && npm run build"
    }


# ── Startup ───────────────────────────────────────────────────────────────────


@app.on_event("startup")
async def startup():
    print("[startup] Initializing database...")
    try:
        init_db()
        print("[startup] DB ready.")
    except Exception as e:
        print(f"[startup] DB error (may not be available yet): {e}")

    print("[startup] Seeding tasks...")
    try:
        seed_tasks()
    except Exception as e:
        print(f"[startup] Seed error: {e}")

    print("[startup] Setting up storage...")
    try:
        ensure_bucket()
    except Exception as e:
        print(f"[startup] Storage error (MinIO may not be available): {e}")

    print("[startup] Ready.")
