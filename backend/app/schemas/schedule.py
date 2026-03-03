import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ScheduleCreate(BaseModel):
    project_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=255)
    cron_expression: str = Field(..., min_length=1, max_length=100)
    target_url: str = Field(..., min_length=1)
    selectors: Dict[str, str] = Field(..., min_length=1)
    render_mode: str = Field(default="static", pattern="^(static|dynamic)$")
    pagination_config: Optional[Dict[str, Any]] = None
    options: Optional[Dict[str, Any]] = None


class ScheduleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    cron_expression: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None
    target_url: Optional[str] = None
    selectors: Optional[Dict[str, str]] = None
    render_mode: Optional[str] = None
    pagination_config: Optional[Dict[str, Any]] = None
    options: Optional[Dict[str, Any]] = None


class ScheduleResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    cron_expression: str
    is_active: bool
    target_url: str
    selectors: Dict[str, str]
    render_mode: str
    pagination_config: Optional[Dict[str, Any]]
    options: Optional[Dict[str, Any]]
    last_job_id: Optional[uuid.UUID]
    next_run_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScheduleListResponse(BaseModel):
    items: List[ScheduleResponse]
    total: int
