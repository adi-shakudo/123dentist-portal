from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db import get_db, PortalUser
from auth import (
    verify_password, generate_password, hash_password,
    make_session_cookie, COOKIE_NAME, COOKIE_MAX_AGE,
)
from email_service import send_welcome_email, send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class ForgotRequest(BaseModel):
    username: str


@router.post("/login")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(PortalUser).filter(PortalUser.username == body.username.strip().lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    session_data = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "clinic_id": user.clinic_id,
    }
    resp = JSONResponse({"role": user.role, "username": user.username, "clinic_id": user.clinic_id})
    resp.set_cookie(
        COOKIE_NAME,
        make_session_cookie(session_data),
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    return resp


@router.post("/logout")
def logout():
    resp = JSONResponse({"message": "Logged out"})
    resp.delete_cookie(COOKIE_NAME)
    return resp


@router.post("/forgot-password")
def forgot_password(body: ForgotRequest, db: Session = Depends(get_db)):
    user = db.query(PortalUser).filter(PortalUser.username == body.username.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that username")

    new_password = generate_password()
    user.password_hash = hash_password(new_password)
    db.commit()

    send_password_reset_email(
        email=user.email,
        username=user.username,
        new_password=new_password,
    )
    return {"message": "Password reset. Check your email for the new credentials."}


@router.get("/me")
def me(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
