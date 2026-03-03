import uuid
import math
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional

from app.database import get_db
from app.models.scrape_result import ScrapeResult, JobLog
from app.models.scrape_job import ScrapeJob
from app.schemas.scrape_result import (
    ScrapeResultListResponse,
    ScrapeResultResponse,
    JobLogListResponse,
    JobLogResponse,
)
from app.services.export_service import export_service

router = APIRouter(prefix="/api", tags=["results"])


@router.get("/jobs/{job_id}/results", response_model=ScrapeResultListResponse)
async def get_results(
    job_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    # Verify job exists
    job_result = await db.execute(select(ScrapeJob).where(ScrapeJob.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    query = select(ScrapeResult).where(ScrapeResult.job_id == job_id)
    count_query = select(func.count(ScrapeResult.id)).where(ScrapeResult.job_id == job_id)

    if search:
        # Search within the JSON data field
        query = query.where(ScrapeResult.data.cast(str).ilike(f"%{search}%"))
        count_query = count_query.where(ScrapeResult.data.cast(str).ilike(f"%{search}%"))

    total = (await db.execute(count_query)).scalar()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    query = query.order_by(ScrapeResult.page_number, ScrapeResult.scraped_at)\
                 .offset((page - 1) * page_size)\
                 .limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    return ScrapeResultListResponse(
        items=[ScrapeResultResponse.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/jobs/{job_id}/export")
async def export_results(
    job_id: uuid.UUID,
    format: str = "csv",
    db: AsyncSession = Depends(get_db),
):
    if format not in ("csv", "json", "excel"):
        raise HTTPException(status_code=400, detail="Format must be csv, json, or excel")

    # Get all results
    result = await db.execute(
        select(ScrapeResult)
        .where(ScrapeResult.job_id == job_id)
        .order_by(ScrapeResult.page_number, ScrapeResult.scraped_at)
    )
    items = result.scalars().all()

    if not items:
        raise HTTPException(status_code=404, detail="No results found for this job")

    # Extract data dictionaries
    data = [item.data for item in items]

    # Get all unique fields
    fields = []
    for row in data:
        for key in row.keys():
            if key not in fields:
                fields.append(key)

    if format == "csv":
        content = export_service.to_csv(data, fields)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=scrapepilot_{job_id}.csv"},
        )
    elif format == "json":
        content = export_service.to_json(data)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=scrapepilot_{job_id}.json"},
        )
    elif format == "excel":
        content = export_service.to_excel(data, fields)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=scrapepilot_{job_id}.xlsx"},
        )


@router.get("/runs/{job_id}/logs", response_model=JobLogListResponse)
async def get_job_logs(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobLog)
        .where(JobLog.job_id == job_id)
        .order_by(JobLog.timestamp)
    )
    logs = result.scalars().all()

    return JobLogListResponse(
        items=[JobLogResponse.model_validate(log) for log in logs],
        total=len(logs),
    )


@router.get("/projects/{project_id}/runs", response_model=dict)
async def get_project_runs(
    project_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(ScrapeJob).where(ScrapeJob.project_id == project_id)
    count_query = select(func.count(ScrapeJob.id)).where(ScrapeJob.project_id == project_id)

    if status:
        query = query.where(ScrapeJob.status == status)
        count_query = count_query.where(ScrapeJob.status == status)

    total = (await db.execute(count_query)).scalar()

    query = query.order_by(desc(ScrapeJob.created_at))\
                 .offset((page - 1) * page_size)\
                 .limit(page_size)

    result = await db.execute(query)
    jobs = result.scalars().all()

    from app.schemas.scrape_job import ScrapeJobResponse
    return {
        "items": [ScrapeJobResponse.model_validate(j) for j in jobs],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 1,
    }
