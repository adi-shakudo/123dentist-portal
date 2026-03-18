"""
Keycloak OIDC middleware.
All routes except /auth/* and /assets/* require a valid session cookie.
"""

import json
import secrets
import httpx
from fastapi import Request
from fastapi.responses import RedirectResponse, JSONResponse
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from config import (
    KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET,
    KEYCLOAK_AUTH_URL,
    KEYCLOAK_TOKEN_URL,
    KEYCLOAK_USERINFO_URL,
    KEYCLOAK_LOGOUT_URL,
    REDIRECT_URI,
    SESSION_SECRET,
    APP_BASE_URL,
)

_signer = URLSafeTimedSerializer(SESSION_SECRET, salt="session")

COOKIE_NAME = "portal_session"
COOKIE_MAX_AGE = 60 * 60 * 8  # 8 hours


def make_session_cookie(data: dict) -> str:
    return _signer.dumps(data)


def read_session_cookie(token: str) -> dict | None:
    try:
        return _signer.loads(token, max_age=COOKIE_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None


def get_session(request: Request) -> dict | None:
    cookie = request.cookies.get(COOKIE_NAME)
    if not cookie:
        return None
    return read_session_cookie(cookie)


def build_login_redirect(request: Request) -> RedirectResponse:
    state = secrets.token_urlsafe(16)
    # Store state + original URL in a temp cookie
    next_url = str(request.url)
    params = (
        f"?response_type=code"
        f"&client_id={KEYCLOAK_CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope=openid+profile+email"
        f"&state={state}"
    )
    resp = RedirectResponse(url=KEYCLOAK_AUTH_URL + params, status_code=302)
    resp.set_cookie("oidc_state", state, max_age=300, httponly=True)
    resp.set_cookie("oidc_next", next_url, max_age=300, httponly=True)
    return resp


async def exchange_code(code: str) -> dict | None:
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.post(
            KEYCLOAK_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "client_id": KEYCLOAK_CLIENT_ID,
                "client_secret": KEYCLOAK_CLIENT_SECRET,
                "code": code,
                "redirect_uri": REDIRECT_URI,
            },
        )
        if resp.status_code != 200:
            return None
        return resp.json()


async def get_userinfo(access_token: str) -> dict | None:
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.get(
            KEYCLOAK_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code != 200:
            return None
        return resp.json()


def is_public_path(path: str) -> bool:
    """Paths that skip auth check."""
    public_prefixes = ["/auth/", "/assets/", "/favicon.ico"]
    return any(path.startswith(p) for p in public_prefixes)


async def auth_middleware(request: Request, call_next):
    path = request.url.path

    if is_public_path(path):
        return await call_next(request)

    session = get_session(request)
    if not session:
        # API calls get 401, page requests get redirect
        if path.startswith("/api/"):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return build_login_redirect(request)

    # Attach session to request state for use in handlers
    request.state.user = session
    return await call_next(request)
