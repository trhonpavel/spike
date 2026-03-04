import json
import secrets
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import webauthn
from webauthn.helpers.structs import (
    PublicKeyCredentialDescriptor,
    UserVerificationRequirement,
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
)
from webauthn.helpers import base64url_to_bytes

from app.config import settings
from app.database import get_db
from app.models.webauthn import WebAuthnCredential

router = APIRouter(prefix="/api/auth", tags=["auth"])

# In-memory token store: token -> expiry
_tokens: dict[str, datetime] = {}

# In-memory challenge store: challenge_bytes -> expiry
_challenges: dict[bytes, datetime] = {}

TOKEN_LIFETIME = timedelta(days=30)
CHALLENGE_LIFETIME = timedelta(minutes=5)


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str


def _issue_token() -> str:
    token = str(uuid4())
    _tokens[token] = datetime.utcnow() + TOKEN_LIFETIME
    return token


def validate_token(token: str) -> bool:
    expiry = _tokens.get(token)
    if expiry is None:
        return False
    if datetime.utcnow() > expiry:
        del _tokens[token]
        return False
    return True


def _require_token(request: Request):
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        if validate_token(auth[7:]):
            return
    raise HTTPException(status_code=401, detail="Unauthorized")


def _store_challenge(challenge: bytes):
    _challenges[challenge] = datetime.utcnow() + CHALLENGE_LIFETIME


def _consume_challenge(challenge: bytes) -> bytes:
    """Consume and return the challenge if valid, otherwise raise."""
    expiry = _challenges.pop(challenge, None)
    if expiry is None or datetime.utcnow() > expiry:
        raise HTTPException(status_code=400, detail="Challenge expired or invalid")
    return challenge


# --- Password login ---


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    if not settings.app_password:
        raise HTTPException(status_code=404, detail="Auth not enabled")

    if not secrets.compare_digest(body.password, settings.app_password):
        raise HTTPException(status_code=401, detail="Wrong password")

    return LoginResponse(token=_issue_token())


# --- WebAuthn status ---


@router.get("/webauthn/status")
async def webauthn_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebAuthnCredential.id).limit(1))
    has_credentials = result.scalar_one_or_none() is not None
    return {"enabled": has_credentials}


# --- WebAuthn registration (requires existing auth) ---


@router.post("/webauthn/register/options")
async def webauthn_register_options(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    _require_token(request)

    result = await db.execute(select(WebAuthnCredential))
    existing = result.scalars().all()

    exclude_credentials = [
        PublicKeyCredentialDescriptor(id=c.credential_id)
        for c in existing
    ]

    options = webauthn.generate_registration_options(
        rp_id=settings.webauthn_rp_id,
        rp_name=settings.webauthn_rp_name,
        user_id=b"spike-user",
        user_name="spike",
        user_display_name="Spike User",
        exclude_credentials=exclude_credentials,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )

    _store_challenge(options.challenge)

    return Response(
        content=webauthn.options_to_json(options),
        media_type="application/json",
    )


@router.post("/webauthn/register/verify")
async def webauthn_register_verify(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    _require_token(request)

    body = await request.body()

    # Extract challenge from clientDataJSON to look up the stored challenge
    cred_json = json.loads(body)
    client_data = json.loads(
        base64url_to_bytes(cred_json["response"]["clientDataJSON"])
    )
    challenge_bytes = base64url_to_bytes(client_data["challenge"])
    expected_challenge = _consume_challenge(challenge_bytes)

    verification = webauthn.verify_registration_response(
        credential=body,
        expected_challenge=expected_challenge,
        expected_rp_id=settings.webauthn_rp_id,
        expected_origin=settings.webauthn_origin,
    )

    credential = WebAuthnCredential(
        credential_id=verification.credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
    )
    db.add(credential)
    await db.commit()

    return {"ok": True}


# --- WebAuthn authentication ---


@router.post("/webauthn/login/options")
async def webauthn_login_options(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebAuthnCredential))
    credentials = result.scalars().all()

    if not credentials:
        raise HTTPException(status_code=404, detail="No passkeys registered")

    allow_credentials = [
        PublicKeyCredentialDescriptor(id=c.credential_id)
        for c in credentials
    ]

    options = webauthn.generate_authentication_options(
        rp_id=settings.webauthn_rp_id,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    _store_challenge(options.challenge)

    return Response(
        content=webauthn.options_to_json(options),
        media_type="application/json",
    )


@router.post("/webauthn/login/verify", response_model=LoginResponse)
async def webauthn_login_verify(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()
    cred_json = json.loads(body)

    # Find credential by ID
    raw_id = base64url_to_bytes(cred_json["rawId"])
    result = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.credential_id == raw_id)
    )
    credential = result.scalar_one_or_none()
    if not credential:
        raise HTTPException(status_code=401, detail="Unknown credential")

    # Extract challenge
    client_data = json.loads(
        base64url_to_bytes(cred_json["response"]["clientDataJSON"])
    )
    challenge_bytes = base64url_to_bytes(client_data["challenge"])
    expected_challenge = _consume_challenge(challenge_bytes)

    verification = webauthn.verify_authentication_response(
        credential=body,
        expected_challenge=expected_challenge,
        expected_rp_id=settings.webauthn_rp_id,
        expected_origin=settings.webauthn_origin,
        credential_public_key=credential.public_key,
        credential_current_sign_count=credential.sign_count,
    )

    credential.sign_count = verification.new_sign_count
    await db.commit()

    return LoginResponse(token=_issue_token())
