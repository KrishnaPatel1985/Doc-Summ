from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class RegisterRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class CurrentUserResponse(BaseModel):
    id: UUID
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CurrentUserResponse


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class MessageResponse(BaseModel):
    message: str
