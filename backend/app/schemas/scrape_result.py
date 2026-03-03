import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ScrapeResultResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    source_url: str
    data: Dict[str, Any]
    page_number: int
    scraped_at: datetime

    model_config = {"from_attributes": True}


class ScrapeResultListResponse(BaseModel):
    items: List[ScrapeResultResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class JobLogResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    level: str
    message: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class JobLogListResponse(BaseModel):
    items: List[JobLogResponse]
    total: int


class ExportRequest(BaseModel):
    format: str = Field(default="csv", pattern="^(csv|json|excel)$")
