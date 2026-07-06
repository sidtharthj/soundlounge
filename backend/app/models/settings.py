"""Settings model — persistent key-value store."""

from typing import Optional

from sqlmodel import Field, SQLModel


class SettingBase(SQLModel):
    key: str = Field(unique=True, index=True)
    value: str = Field(default="")
    type: str = Field(default="string")  # string | int | float | bool | json


class Setting(SettingBase, table=True):
    __tablename__ = "settings"

    id: Optional[int] = Field(default=None, primary_key=True)


class SettingCreate(SQLModel):
    key: str
    value: str
    type: str = "string"


class SettingRead(SQLModel):
    id: int
    key: str
    value: str
    type: str
