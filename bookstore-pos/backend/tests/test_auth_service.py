"""
Tests unitarios para AuthService
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.services.auth.auth_service import AuthService
from app.models.user import User


class TestAuthService:
    """Tests para AuthService"""

    @pytest.fixture
    def mock_db(self):
        """Base de datos mockeada"""
        db = AsyncMock()
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        db.add = MagicMock()
        db.get = AsyncMock()
        return db

    @pytest.fixture
    def auth_service(self, mock_db):
        """Instancia de AuthService con DB mockeada"""
        return AuthService(mock_db)

    @pytest.fixture
    def mock_user(self):
        """Usuario mockeado"""
        user = MagicMock(spec=User)
        user.id = 1
        user.username = "testuser"
        user.password_hash = "hashed_password"
        user.role = "admin"
        user.is_active = True
        user.failed_attempts = 0
        user.locked_until = None
        user.twofa_enabled = False
        user.twofa_secret = ""
        return user

    def test_now_returns_utc(self, auth_service):
        """_now() debe retornar datetime UTC"""
        result = auth_service._now()
        assert result.tzinfo == timezone.utc

    def test_as_utc_with_naive_datetime(self, auth_service):
        """_as_utc() debe convertir datetime naive a UTC"""
        naive_dt = datetime(2024, 1, 1, 12, 0, 0)
        result = auth_service._as_utc(naive_dt)
        assert result.tzinfo == timezone.utc
        assert result.year == 2024

    def test_as_utc_with_aware_datetime(self, auth_service):
        """_as_utc() debe mantener datetime que ya tiene timezone"""
        aware_dt = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        result = auth_service._as_utc(aware_dt)
        assert result == aware_dt

    def test_verify_totp_with_empty_code(self, auth_service):
        """_verify_totp() debe retornar False con codigo vacio"""
        assert auth_service._verify_totp("secret", "") is False
        assert auth_service._verify_totp("secret", "   ") is False

    def test_verify_totp_with_invalid_code(self, auth_service):
        """_verify_totp() debe retornar False con codigo invalido"""
        assert auth_service._verify_totp("invalid_secret", "123456") is False

    @pytest.mark.asyncio
    async def test_revoke_access_family(self, auth_service, mock_db):
        """_revoke_access_family() debe ejecutar update correcto"""
        family_id = "test-family-123"
        revoked_at = datetime.now(timezone.utc)

        await auth_service._revoke_access_family(family_id, revoked_at=revoked_at)

        mock_db.execute.assert_called_once()
        call_args = mock_db.execute.call_args[0][0]
        assert call_args is not None

    @pytest.mark.asyncio
    async def test_revoke_refresh_family(self, auth_service, mock_db):
        """_revoke_refresh_family() debe ejecutar update correcto"""
        family_id = "test-family-456"
        revoked_at = datetime.now(timezone.utc)

        await auth_service._revoke_refresh_family(family_id, revoked_at=revoked_at)

        mock_db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_revoke_family_tokens(self, auth_service, mock_db):
        """_revoke_family_tokens() debe revocar ambos tipos de tokens"""
        family_id = "test-family-789"
        revoked_at = datetime.now(timezone.utc)

        await auth_service._revoke_family_tokens(family_id, revoked_at=revoked_at)

        assert mock_db.execute.call_count == 2

    def test_account_lock_threshold_from_settings(self):
        """account_lock_threshold debe estar configurado correctamente"""
        from app.core.config import settings
        assert settings.account_lock_threshold >= 1
        assert settings.account_lock_threshold <= 10

    def test_account_lock_minutes_from_settings(self):
        """account_lock_minutes debe estar configurado correctamente"""
        from app.core.config import settings
        assert settings.account_lock_minutes >= 5
        assert settings.account_lock_minutes <= 60


class TestPasswordValidation:
    """Tests para validacion de contraseñas"""

    def test_validate_password_success(self):
        """validate_password() no debe lanzar excepcion con password valido"""
        from app.core.security import validate_password
        # No debe lanzar excepcion
        validate_password("Password123")

    def test_validate_password_too_short(self):
        """validate_password() debe lanzar error si es muy corta"""
        from app.core.security import validate_password

        with pytest.raises(ValueError, match="al menos"):
            validate_password("Aa1")  # Menos de password_min_length

    def test_validate_password_no_upper(self):
        """validate_password() debe lanzar error si no tiene mayuscula"""
        from app.core.security import validate_password

        with pytest.raises(ValueError, match="mayuscula"):
            validate_password("password123")

    def test_validate_password_no_lower(self):
        """validate_password() debe lanzar error si no tiene minuscula"""
        from app.core.security import validate_password

        with pytest.raises(ValueError, match="minuscula"):
            validate_password("PASSWORD123")

    def test_validate_password_no_digit(self):
        """validate_password() debe lanzar error si no tiene digito"""
        from app.core.security import validate_password

        # Usar password de 10+ caracteres sin digitos para pasar validacion de longitud
        with pytest.raises(ValueError, match="numero"):
            validate_password("PasswordAb")
