import secrets
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

# In-memory token store: token -> expiry
_tokens: dict[str, datetime] = {}

TOKEN_LIFETIME = timedelta(days=30)


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str


def validate_token(token: str) -> bool:
    expiry = _tokens.get(token)
    if expiry is None:
        return False
    if datetime.utcnow() > expiry:
        del _tokens[token]
        return False
    return True


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    if not settings.app_password:
        raise HTTPException(status_code=404, detail="Auth not enabled")

    if not secrets.compare_digest(body.password, settings.app_password):
        raise HTTPException(status_code=401, detail="Wrong password")

    token = str(uuid4())
    _tokens[token] = datetime.utcnow() + TOKEN_LIFETIME
    return LoginResponse(token=token)
