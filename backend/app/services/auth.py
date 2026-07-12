import base64
import hashlib
import hmac
import html
import json
import re
import secrets
import smtplib
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models.user import PasswordResetToken, User

PASSWORD_SCHEME = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 260_000
JWT_ALGORITHM = "HS256"
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
RESET_PASSWORD_MESSAGE = "If an account exists, a reset link has been sent."

bearer_scheme = HTTPBearer(auto_error=False)


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def validate_email(email: str) -> bool:
    return bool(EMAIL_RE.match(normalize_email(email)))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return "$".join([
        PASSWORD_SCHEME,
        str(PASSWORD_ITERATIONS),
        _b64encode(salt),
        _b64encode(digest),
    ])


def create_password_reset_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    row = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_reset_token(token),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.password_reset_token_minutes),
    )
    db.add(row)
    db.commit()
    return token


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def find_valid_reset_token(db: Session, token: str) -> PasswordResetToken | None:
    token_hash = hash_reset_token((token or "").strip())
    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()
    if not row or row.used_at is not None:
        return None
    if row.expires_at < datetime.utcnow():
        return None
    return row


def mark_reset_tokens_used(db: Session, user_id: UUID) -> None:
    now = datetime.utcnow()
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": now})


def send_password_reset_link(email: str, token: str) -> None:
    base_url = settings.app_base_url.rstrip("/")
    reset_link = f"{base_url}/reset-password?token={token}"
    if settings.resend_configured:
        _send_password_reset_resend(email, reset_link)
        return
    if settings.smtp_configured:
        _send_password_reset_email(email, reset_link)
        return
    _log_password_reset_link(reset_link)


def _log_password_reset_link(reset_link: str) -> None:
    print(f"DOCSUMM PASSWORD RESET LINK:\n{reset_link}", flush=True)


def _send_password_reset_resend(email: str, reset_link: str) -> None:
    escaped_link = html.escape(reset_link, quote=True)
    payload = {
        "from": settings.resend_from_email,
        "to": [email],
        "subject": "Reset your DocSumm password",
        "text": _password_reset_text(reset_link),
        "html": (
            "<p>Use the link below to reset your DocSumm password.</p>"
            f'<p><a href="{escaped_link}">Reset your password</a></p>'
            f"<p>This link expires in {settings.password_reset_token_minutes} minutes. "
            "If you did not request this, you can ignore this email.</p>"
        ),
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=data,
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            if response.status >= 300:
                body = response.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"Resend email failed with status {response.status}: {body}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Resend email failed with status {exc.code}: {body}") from exc


def _send_password_reset_email(email: str, reset_link: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "Reset your DocSumm password"
    msg["From"] = settings.smtp_from_email
    msg["To"] = email
    msg.set_content(_password_reset_text(reset_link))

    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            _smtp_login_if_needed(smtp)
            smtp.send_message(msg)
        return

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        smtp.starttls()
        _smtp_login_if_needed(smtp)
        smtp.send_message(msg)


def _password_reset_text(reset_link: str) -> str:
    return (
        "Use the link below to reset your DocSumm password.\n\n"
        f"{reset_link}\n\n"
        f"This link expires in {settings.password_reset_token_minutes} minutes. "
        "If you did not request this, you can ignore this email."
    )


def _smtp_login_if_needed(smtp: smtplib.SMTP) -> None:
    if settings.smtp_username or settings.smtp_password:
        smtp.login(settings.smtp_username, settings.smtp_password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        scheme, iterations_raw, salt_raw, digest_raw = password_hash.split("$", 3)
        if scheme != PASSWORD_SCHEME:
            return False
        iterations = int(iterations_raw)
        salt = _b64decode(salt_raw)
        expected = _b64decode(digest_raw)
    except (ValueError, TypeError):
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(actual, expected)


def create_access_token(user_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.auth_token_minutes)).timestamp()),
    }
    return _encode_jwt(payload)


def decode_access_token(token: str) -> dict:
    try:
        header_raw, payload_raw, signature_raw = token.split(".", 2)
    except Exception:
        raise _credentials_error()

    signed = f"{header_raw}.{payload_raw}".encode("ascii")
    expected_signature = _sign(signed)
    try:
        signature = _b64decode(signature_raw)
    except Exception:
        raise _credentials_error()
    if not hmac.compare_digest(signature, expected_signature):
        raise _credentials_error()

    try:
        header = json.loads(_b64decode(header_raw))
        payload = json.loads(_b64decode(payload_raw))
    except Exception:
        raise _credentials_error()

    if header.get("alg") != JWT_ALGORITHM or header.get("typ") != "JWT":
        raise _credentials_error()
    if int(payload.get("exp", 0)) < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _credentials_error()
    payload = decode_access_token(credentials.credentials)
    raw_sub = payload.get("sub")
    try:
        user_id = UUID(str(raw_sub))
    except (ValueError, TypeError):
        raise _credentials_error()

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise _credentials_error()
    return user


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if credentials is None:
        return None
    return get_current_user(credentials, db)


def _encode_jwt(payload: dict) -> str:
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    header_raw = _b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_raw = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signed = f"{header_raw}.{payload_raw}".encode("ascii")
    signature = _b64encode(_sign(signed))
    return f"{header_raw}.{payload_raw}.{signature}"


def _sign(value: bytes) -> bytes:
    return hmac.new(settings.resolved_auth_secret_key.encode("utf-8"), value, hashlib.sha256).digest()


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def _credentials_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
