import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    cron_expression: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Job template - stores the scrape config to use
    target_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    selectors: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    render_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="static")
    pagination_config: Mapped[dict] = mapped_column(JSONB, nullable=True, default=dict)
    options: Mapped[dict] = mapped_column(JSONB, nullable=True, default=dict)

    last_job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    next_run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


