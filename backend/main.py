import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware

from auth import (
    auth_middleware,
    exchange_code,
    get_userinfo,
    make_session_cookie,
    read_session_cookie,
    COOKIE_NAME,
    COOKIE_MAX_AGE,
    KEYCLOAK_LOGOUT_URL,
    APP_BASE_URL,
)
from db import init_db
from seed import seed_tasks
from storage import ensure_bucket
from routers import admin, portal, files

DIST = Path(__file__).parent.parent / "frontend" / "dist"

app = FastAPI(docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
app.add_middleware(BaseHTTPMiddleware, dispatch=auth_middleware)

# Routers
app.include_router(admin.router)
app.include_router(portal.router)
app.include_router(files.router)


# ── Auth Routes ───────────────────────────────────────────────────────────────


@app.get("/auth/login")
async def login(request: Request):
    from auth import build_login_redirect

    return build_login_redirect(request)


@app.get("/auth/callback")
async def callback(
    request: Request, code: str = None, state: str = None, error: str = None
):
    if error or not code:
        return RedirectResponse(url="/auth/login")

    stored_state = request.cookies.get("oidc_state")
    if state and stored_state and state != stored_state:
        return RedirectResponse(url="/auth/login")

    tokens = await exchange_code(code)
    if not tokens:
        return RedirectResponse(url="/auth/login")

    userinfo = await get_userinfo(tokens["access_token"])
    if not userinfo:
        return RedirectResponse(url="/auth/login")

    # Determine role from Keycloak realm_access or resource_access
    roles = []
    realm_access = userinfo.get("realm_access") or tokens.get("realm_access") or {}
    roles = realm_access.get("roles", [])

    role = (
        "internal_admin"
        if "internal_admin" in roles or "admin" in roles
        else "clinic_partner"
    )

    session_data = {
        "sub": userinfo.get("sub"),
        "preferred_username": userinfo.get("preferred_username"),
        "email": userinfo.get("email"),
        "name": userinfo.get("name"),
        "role": role,
    }

    next_url = request.cookies.get("oidc_next", "/")
    # Avoid redirect loops
    if "/auth/" in next_url:
        next_url = "/"

    resp = RedirectResponse(url=next_url, status_code=302)
    resp.set_cookie(
        COOKIE_NAME,
        make_session_cookie(session_data),
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    resp.delete_cookie("oidc_state")
    resp.delete_cookie("oidc_next")
    return resp


@app.get("/auth/logout")
async def logout(request: Request):
    resp = RedirectResponse(
        url=f"{KEYCLOAK_LOGOUT_URL}?redirect_uri={APP_BASE_URL}",
        status_code=302,
    )
    resp.delete_cookie(COOKIE_NAME)
    return resp


@app.get("/api/me")
async def api_me(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        from fastapi import HTTPException

        raise HTTPException(status_code=401)
    return user


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
