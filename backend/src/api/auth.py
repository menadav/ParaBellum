import os
import uuid
import jwt
import psycopg
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from api.deps import get_conn
from models import Role, User
from repositories import profiles

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")

if not SUPABASE_URL:
    raise RuntimeError("Falta SUPABASE_URL en backend/.env")

_JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
_ISSUER = f"{SUPABASE_URL}/auth/v1"

_jwk_client = PyJWKClient(_JWKS_URL, cache_keys=True)
bearer = HTTPBearer(description="El access_token que da Supabase")


def _no_autorizado(motivo: str) -> HTTPException:
    """401: no se quien eres, o tu token no vale."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=motivo,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credenciales: HTTPAuthorizationCredentials = Depends(bearer),
    conn: psycopg.Connection = Depends(get_conn),
) -> User:
    token = credenciales.credentials
    try:
        clave = _jwk_client.get_signing_key_from_jwt(token)
        datos = jwt.decode(
            token,
            clave.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=_ISSUER,
        )
    except jwt.ExpiredSignatureError:
        raise _no_autorizado("El token ha caducado. Vuelve a entrar.")
    except jwt.InvalidTokenError as e:
        raise _no_autorizado(f"Token invalido: {e}")

    sub = datos.get("sub")
    if not sub:
        raise _no_autorizado("El token no dice a quien pertenece")

    usuario = profiles.get_by_id(conn, uuid.UUID(sub))
    if usuario is None:
        raise _no_autorizado(
            "Token valido, pero este usuario no tiene perfil en la app"
        )

    return usuario


def require_coach(
    usuario: User = Depends(get_current_user),
) -> User:
    if usuario.role is not Role.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un coach puede hacer esto",
        )
    return usuario
