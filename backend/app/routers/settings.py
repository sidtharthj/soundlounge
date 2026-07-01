"""Settings router — manage persistent configuration settings."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Dict, Any

from app.database import get_session
from app.models.settings import Setting, SettingCreate, SettingRead

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def get_all_settings(session: AsyncSession = Depends(get_session)) -> Dict[str, str]:
    """Get all settings as a flat key-value dictionary."""
    stmt = select(Setting)
    result = await session.execute(stmt)
    settings_list = result.scalars().all()
    return {s.key: s.value for s in settings_list}


@router.put("")
async def update_settings(
    payload: Dict[str, str],
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    """Bulk update or create settings."""
    for key, value in payload.items():
        stmt = select(Setting).where(Setting.key == key)
        setting = (await session.execute(stmt)).scalars().first()
        
        if setting:
            setting.value = str(value)
        else:
            setting = Setting(key=key, value=str(value), type="string")
            
        session.add(setting)
        
    await session.commit()
    return {"success": True}


@router.get("/{key}", response_model=SettingRead)
async def get_setting(key: str, session: AsyncSession = Depends(get_session)) -> Any:
    """Get details for a specific setting key."""
    stmt = select(Setting).where(Setting.key == key)
    setting = (await session.execute(stmt)).scalars().first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    return setting
