import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, HttpUrl


class PaginationConfig(BaseModel):
    enabled: bool = False
    type: str = "next_button"  # next_button | page_numbers | infinite_scroll
    next_selector: Optional[str] = None
    max_pages: int = Field(default=10, ge=1, le=1000)
    wait_after_scroll_ms: Optional[int] = 2000


class ScrapeOptions(BaseModel):
    rate_limit_ms: int = Field(default=1000, ge=200)
    max_retries: int = Field(default=3, ge=0, le=10)
    timeout_seconds: int = Field(default=30, ge=5, le=120)
    user_agent: Optional[str] = None
    respect_robots_txt: bool = True
    wait_for_selector: Optional[str] = None
    wait_timeout_ms: int = Field(default=10000, ge=1000, le=60000)


class ScrapeJobCreate(BaseModel):
    project_id: uuid.UUID
    target_url: str = Field(..., min_length=1)
    selectors: Dict[str, str] = Field(..., min_length=1)  # {"field_name": "css_selector"}
    render_mode: str = Field(default="static", pattern="^(static|dynamic)$")
    pagination_config: Optional[PaginationConfig] = None
    headers: Optional[Dict[str, str]] = None
    cookies: Optional[Dict[str, str]] = None
    options: Optional[ScrapeOptions] = None


class ScrapeJobResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    target_url: str
    selectors: Dict[str, str]
    render_mode: str
    pagination_config: Optional[Dict[str, Any]]
    headers: Optional[Dict[str, str]]
    cookies: Optional[Dict[str, str]]
    options: Optional[Dict[str, Any]]
    status: str
    total_pages: int
    scraped_pages: int
    total_items: int
    duration_seconds: Optional[float]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    celery_task_id: Optional[str] = None

    model_config = {"from_attributes": True}


class ScrapeJobListResponse(BaseModel):
    items: List[ScrapeJobResponse]
    total: int


class ScrapePreviewRequest(BaseModel):
    target_url: str = Field(..., min_length=1)
    selectors: Dict[str, str] = Field(..., min_length=1)
    render_mode: str = Field(default="static", pattern="^(static|dynamic)$")
    headers: Optional[Dict[str, str]] = None
    cookies: Optional[Dict[str, str]] = None


class ScrapePreviewResponse(BaseModel):
    success: bool
    data: List[Dict[str, Any]] = []
    page_title: Optional[str] = None
    total_found: int = 0
    error: Optional[str] = None


class RobotsCheckRequest(BaseModel):
    url: str


class RobotsCheckResponse(BaseModel):
    url: str
    allowed: bool
    robots_url: str
    details: Optional[str] = None
