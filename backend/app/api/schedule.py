import uuid
from datetime import datetime, timezone
from croniter import croniter
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.schedule import Schedule
from app.models.project import Project
from app.schemas.schedule import (
    ScheduleCreate,
    ScheduleUpdate,
    ScheduleResponse,
    ScheduleListResponse,
)

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("", response_model=ScheduleListResponse)
async def list_schedules(
    project_id: uuid.UUID = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Schedule)
    if project_id:
        query = query.where(Schedule.project_id == project_id)
    query = query.order_by(Schedule.created_at.desc())

    result = await db.execute(query)
    schedules = result.scalars().all()

    return ScheduleListResponse(
        items=[ScheduleResponse.model_validate(s) for s in schedules],
        total=len(schedules),
    )


@router.post("", response_model=ScheduleResponse, status_code=201)
async def create_schedule(
    data: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
):
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == data.project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate cron expression
    try:
        cron = croniter(data.cron_expression, datetime.now(timezone.utc))
        next_run = cron.get_next(datetime)
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid cron expression: {str(e)}")

    schedule = Schedule(
        project_id=data.project_id,
        name=data.name,
        cron_expression=data.cron_expression,
        target_url=data.target_url,
        selectors=data.selectors,
        render_mode=data.render_mode,
        pagination_config=data.pagination_config or {},
        options=data.options or {},
        next_run_at=next_run,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)

    return ScheduleResponse.model_validate(schedule)


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: uuid.UUID,
    data: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)

    # Recalculate next run if cron changed
    if "cron_expression" in update_data:
        try:
            cron = croniter(schedule.cron_expression, datetime.now(timezone.utc))
            schedule.next_run_at = cron.get_next(datetime)
        except (ValueError, KeyError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid cron expression: {str(e)}")

    await db.commit()
    await db.refresh(schedule)

    return ScheduleResponse.model_validate(schedule)


@router.delete("/{schedule_id}", status_code=204)
async def delete_schedule(
    schedule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    await db.delete(schedule)
    await db.commit()
