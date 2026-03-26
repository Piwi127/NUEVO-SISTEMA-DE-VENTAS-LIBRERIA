"""
Modelo de permisos por rol.
Contiene asignaciones de permisos a roles de usuario.
"""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RolePermission(Base):
    """Permiso asociado a un rol de usuario."""

    __tablename__ = "role_permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[str] = mapped_column(String(20), index=True)
    permission: Mapped[str] = mapped_column(String(100), index=True)
