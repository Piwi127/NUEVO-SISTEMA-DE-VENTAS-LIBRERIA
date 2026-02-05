from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate, PasswordUpdate, StatusUpdate, TwoFAConfirm
from app.services.admin.users_service import UsersService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut], dependencies=[Depends(require_permission("users.read"))])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.post("", response_model=UserOut, status_code=201, dependencies=[Depends(require_permission("users.write"))])
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = UsersService(db, current_user)
    return await service.create_user(data)


@router.put("/{user_id}", response_model=UserOut, dependencies=[Depends(require_permission("users.write"))])
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = UsersService(db, current_user)
    return await service.update_user(user_id, data)


@router.patch("/{user_id}/password", dependencies=[Depends(require_permission("users.write"))])
async def update_password(
    user_id: int,
    data: PasswordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = UsersService(db, current_user)
    return await service.update_password(user_id, data)


@router.patch("/{user_id}/status", dependencies=[Depends(require_permission("users.write"))])
async def update_status(
    user_id: int,
    data: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = UsersService(db, current_user)
    return await service.update_status(user_id, data)


@router.post("/{user_id}/unlock", dependencies=[Depends(require_permission("users.write"))])
async def unlock_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = UsersService(db, current_user)
    return await service.unlock_user(user_id)


@router.post("/{user_id}/2fa/setup", dependencies=[Depends(require_permission("users.write"))])
async def setup_user_2fa(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = UsersService(db, current_user)
    return await service.setup_user_2fa(user_id)


@router.post("/{user_id}/2fa/confirm", dependencies=[Depends(require_permission("users.write"))])
async def confirm_user_2fa(
    user_id: int,
    data: TwoFAConfirm,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = UsersService(db, current_user)
    return await service.confirm_user_2fa(user_id, data)


@router.post("/{user_id}/2fa/reset", dependencies=[Depends(require_permission("users.write"))])
async def reset_user_2fa(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = UsersService(db, current_user)
    return await service.reset_user_2fa(user_id)
