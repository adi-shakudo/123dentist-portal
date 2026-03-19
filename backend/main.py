from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware

from auth import auth_middleware, get_session, COOKIE_NAME
from db import init_db, SessionLocal, PortalUser
from seed import seed_tasks
from storage import ensure_bucket
from routers import admin, portal, files
from routers.auth_routes import router as auth_router

DIST = Path(__file__).parent.parent / "frontend" / "dist"

app = FastAPI(docs_url=None, redoc_url=None)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.add_middleware(BaseHTTPMiddleware, dispatch=auth_middleware)

app.include_router(auth_router)
app.include_router(admin.router)
app.include_router(portal.router)
app.include_router(files.router)


@app.get("/api/me")
async def api_me(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str, request: Request):
    if full_path.startswith("api"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404)
    if DIST.exists():
        return FileResponse(str(DIST / "index.html"))
    return {"message": "Frontend not built yet."}


def seed_admin_user():
    from auth import hash_password
    db = SessionLocal()
    try:
        existing = db.query(PortalUser).filter(PortalUser.username == "admin").first()
        if not existing:
            admin_user = PortalUser(
                username="admin",
                password_hash=hash_password("admin"),
                role="admin",
                email="admin@123dentist.com",
                clinic_id=None,
            )
            db.add(admin_user)
            db.commit()
            print("[startup] Admin user seeded (username=admin, password=admin)")
        else:
            print("[startup] Admin user already exists")
    except Exception as e:
        db.rollback()
        print(f"[startup] Admin seed error: {e}")
    finally:
        db.close()


@app.on_event("startup")
async def startup():
    print("[startup] Initializing database...")
    try:
        init_db()
        print("[startup] DB ready.")
    except Exception as e:
        print(f"[startup] DB error: {e}")

    print("[startup] Seeding tasks...")
    try:
        seed_tasks()
    except Exception as e:
        print(f"[startup] Seed error: {e}")

    print("[startup] Seeding admin user...")
    try:
        seed_admin_user()
    except Exception as e:
        print(f"[startup] Admin seed error: {e}")

    print("[startup] Setting up storage...")
    try:
        ensure_bucket()
    except Exception as e:
        print(f"[startup] Storage error (MinIO may not be available): {e}")

    print("[startup] Ready.")
