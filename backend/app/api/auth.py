import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    CurrentUserResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.services.auth import (
    RESET_PASSWORD_MESSAGE,
    create_access_token,
    create_password_reset_token,
    find_valid_reset_token,
    get_current_user,
    hash_password,
    mark_reset_tokens_used,
    normalize_email,
    send_password_reset_link,
    validate_email,
    verify_password,
)

router = APIRouter()
logger = logging.getLogger("uvicorn.error")


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    first_name = (payload.first_name or "").strip()
    last_name = (payload.last_name or "").strip()
    legacy_name = (payload.name or "").strip()
    name = " ".join(part for part in [first_name, last_name] if part).strip() or legacy_name
    email = normalize_email(payload.email)
    password = payload.password or ""

    if not name:
        raise HTTPException(status_code=400, detail="First name and last name are required.")
    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    if not first_name and legacy_name:
        parts = legacy_name.split()
        first_name = parts[0]
        last_name = " ".join(parts[1:])

    user = User(
        name=name,
        first_name=first_name or None,
        last_name=last_name or None,
        email=email,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(access_token=create_access_token(user.id), user=CurrentUserResponse.model_validate(user))


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password or "", user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return AuthResponse(access_token=create_access_token(user.id), user=CurrentUserResponse.model_validate(user))


@router.get("/auth/me", response_model=CurrentUserResponse)
def me(current_user: User = Depends(get_current_user)):
    return CurrentUserResponse.model_validate(current_user)


@router.post("/auth/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    if validate_email(email):
        user = db.query(User).filter(User.email == email).first()
        if user:
            token = create_password_reset_token(db, user)
            try:
                send_password_reset_link(email, token)
            except Exception:
                # Preserve account privacy: never reveal whether delivery failed
                # for a matching email address.
                logger.exception("Failed to send password reset email.")
    return MessageResponse(message=RESET_PASSWORD_MESSAGE)


@router.post("/auth/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    password = payload.password or ""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    reset_token = find_valid_reset_token(db, payload.token)
    if not reset_token:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired.")

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired.")

    user.password_hash = hash_password(password)
    mark_reset_tokens_used(db, user.id)
    db.commit()
    return MessageResponse(message="Your password has been reset. You can now sign in.")
