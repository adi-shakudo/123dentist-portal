import re
import secrets
import string
from datetime import datetime

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from passlib.context import CryptContext
from fastapi import Request
from fastapi.responses import JSONResponse

from config import SESSION_SECRET

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_signer = URLSafeTimedSerializer(SESSION_SECRET, salt="portal-session")

COOKIE_NAME = "portal_session"
COOKIE_MAX_AGE = 60 * 60 * 12  # 12 hours


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def generate_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


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


async def auth_middleware(request: Request, call_next):
    path = request.url.path
    public = ["/api/auth/", "/assets/", "/favicon.ico"]
    if any(path.startswith(p) for p in public):
        return await call_next(request)

    session = get_session(request)
    if session:
        request.state.user = session
        return await call_next(request)

    if path.startswith("/api/"):
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)

    return await call_next(request)
