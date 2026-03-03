import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ShareLinkCreate(BaseModel):
    ttl_days: Optional[int] = Field(default=None, ge=1, le=365)


class ShareLinkResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    token: str
    expires_at: Optional[datetime]
    created_at: datetime
    share_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ShareLinkListResponse(BaseModel):
    items: List[ShareLinkResponse]
    total: int


class SharedDataResponse(BaseModel):
    job: dict
    results: List[dict]
    total_results: int
    page: int
    page_size: int
    total_pages: int
    expires_at: Optional[datetime] = None
