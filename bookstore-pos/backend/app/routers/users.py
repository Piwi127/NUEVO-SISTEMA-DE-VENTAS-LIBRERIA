import pyotp
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate, PasswordUpdate, StatusUpdate, TwoFAConfirm

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_role("admin"))])


@router.get("", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.post("", response_model=UserOut, status_code=201)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    exists = await db.execute(select(User).where(User.username == data.username))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username duplicado")
    user = User(
        username=data.username,
        password_hash=get_password_hash(data.password),
        role=data.role,
        is_active=data.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserOut)
async def update_user(user_id: int, data: UserUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.username != data.username:
        exists = await db.execute(select(User).where(User.username == data.username))
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username duplicado")
    user.username = data.username
    user.role = data.role
    user.is_active = data.is_active
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/password")
async def update_password(user_id: int, data: PasswordUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.password_hash = get_password_hash(data.password)
    await db.commit()
    return {"ok": True}


@router.patch("/{user_id}/status")
async def update_status(user_id: int, data: StatusUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.is_active = data.is_active
    await db.commit()
    return {"ok": True}


@router.post("/{user_id}/unlock")
async def unlock_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.failed_attempts = 0
    user.locked_until = None
    await db.commit()
    return {"ok": True}


@router.post("/{user_id}/2fa/setup")
async def setup_user_2fa(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    secret = pyotp.random_base32()
    user.twofa_secret = secret
    user.twofa_enabled = False
    await db.commit()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.username, issuer_name="Bookstore POS")
    return {"secret": secret, "otpauth": uri}


@router.post("/{user_id}/2fa/confirm")
async def confirm_user_2fa(user_id: int, data: TwoFAConfirm, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not user.twofa_secret:
        raise HTTPException(status_code=400, detail="2FA no configurado")
    totp = pyotp.TOTP(user.twofa_secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Codigo invalido")
    user.twofa_enabled = True
    await db.commit()
    return {"ok": True}


@router.post("/{user_id}/2fa/reset")
async def reset_user_2fa(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.twofa_enabled = False
    user.twofa_secret = ""
    await db.commit()
    return {"ok": True}
