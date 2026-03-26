"""
Dependencias FastAPI para autenticación y autorización.

Proporciona:
- get_db: Proveedor de sesión de base de datos
- get_current_user: Extrae usuario del token JWT
- require_role: Verifica rol de usuario
- require_permission: Verifica permisos específicos
"""

from collections.abc import AsyncGenerator, Callable
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.permission import RolePermission
from app.models.session import UserSession
from app.seed import default_permissions_for

# Esquema de seguridad HTTP Bearer
security = HTTPBearer(auto_error=False)


def _normalize_role(role: str | None) -> str:
    """
    Normaliza el nombre del rol a minúsculas sin espacios.

    Args:
        role: Nombre del rol.

    Returns:
        Rol normalizado en minúsculas.
    """
    return (role or "").strip().lower()


async def _resolve_user_from_token(db: AsyncSession, token: str) -> User | None:
    """
    Resuelve el usuario a partir de un token JWT válido.

    Args:
        db: Sesión de base de datos.
        token: Token JWT de acceso.

    Returns:
        Usuario si el token es válido y la sesión no ha expirado, None en caso contrario.
    """
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        jti = payload.get("jti")
        token_type = payload.get("typ")
    except ValueError:
        return None

    if not username or not jti:
        return None
    if token_type and token_type != "access":
        return None

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None

    sess_result = await db.execute(select(UserSession).where(UserSession.jti == jti))
    session = sess_result.scalar_one_or_none()
    if not session or session.revoked_at is not None:
        return None

    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    if session.user_id != user.id:
        return None
    return user


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Proveedor de sesión de base de datos async.

    Yields:
        Sesión de base de datos para usar en endpoints.
    """
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extrae el usuario actual autenticado del token JWT.

    Busca el token en:
    1. Header Authorization: Bearer <token>
    2. Cookie de autenticación

    Args:
        request: Request de FastAPI.
        credentials: Credenciales del header Authorization.
        db: Sesión de base de datos.

    Returns:
        Usuario autenticado.

    Raises:
        HTTPException 401: Si no hay token válido.
    """
    token_candidates: list[str] = []
    if credentials and credentials.credentials:
        token_candidates.append(credentials.credentials)
    cookie_token = request.cookies.get(settings.auth_cookie_name)
    if cookie_token and cookie_token not in token_candidates:
        token_candidates.append(cookie_token)

    if not token_candidates:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido"
        )

    for token in token_candidates:
        user = await _resolve_user_from_token(db, token)
        if user is not None:
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido"
    )


def require_role(*roles: str) -> Callable:
    """
    Crea una dependencia FastAPI que verifica si el usuario tiene uno de los roles especificados.

    Args:
        *roles: Roles permitidos (admin, cashier, stock, etc.)

    Returns:
        Dependencia FastAPI que verifica el rol.
    """
    normalized_roles = {
        _normalize_role(role) for role in roles if _normalize_role(role)
    }

    async def _checker(current_user: User = Depends(get_current_user)) -> User:
        if _normalize_role(current_user.role) not in normalized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos"
            )
        return current_user

    return _checker


def require_permission(*permissions: str) -> Callable:
    """
    Crea una dependencia FastAPI que verifica si el usuario tiene los permisos especificados.

    Args:
        *permissions: Permisos requeridos (products.read, sales.create, etc.)

    Returns:
        Dependencia FastAPI que verifica los permisos.
    """
    required_permissions = [
        perm.strip() for perm in permissions if perm and perm.strip()
    ]

    async def _checker(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        normalized_role = _normalize_role(current_user.role)

        if normalized_role == "admin":
            return current_user

        result = await db.execute(
            select(RolePermission.permission).where(
                func.lower(func.trim(RolePermission.role)) == normalized_role
            )
        )
        allowed = {str(row[0]).strip() for row in result.all() if row[0]}

        if not allowed and normalized_role in {"cashier", "stock"}:
            allowed = set(default_permissions_for(normalized_role))

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos"
            )

        if "*" in allowed:
            return current_user

        for perm in required_permissions:
            if perm not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos"
                )
        return current_user

    return _checker
