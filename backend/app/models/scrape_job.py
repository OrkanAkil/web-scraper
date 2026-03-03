import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ScrapeJob(Base):
    __tablename__ = "scrape_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    target_url: Mapped[str] = mapped_column(Text, nullable=False)
    selectors: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    render_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="static")  # static | dynamic
    pagination_config: Mapped[dict] = mapped_column(JSONB, nullable=True, default=dict)
    headers: Mapped[dict] = mapped_column(JSONB, nullable=True, default=dict)
    cookies: Mapped[dict] = mapped_column(JSONB, nullable=True, default=dict)
    options: Mapped[dict] = mapped_column(JSONB, nullable=True, default=dict)

    # Status tracking
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending | running | completed | failed | cancelled
    total_pages: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    scraped_pages: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    # Timestamps
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Celery task ID for cancellation
    celery_task_id: Mapped[str] = mapped_column(String(255), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="scrape_jobs")
    results = relationship("ScrapeResult", back_populates="job", cascade="all, delete-orphan", lazy="selectin")
    logs = relationship("JobLog", back_populates="job", cascade="all, delete-orphan", lazy="selectin")
    share_links = relationship("ShareLink", back_populates="job", cascade="all, delete-orphan", lazy="selectin")
