import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.project import Project
from app.models.scrape_job import ScrapeJob
from app.schemas.scrape_job import (
    ScrapeJobCreate,
    ScrapeJobResponse,
    ScrapePreviewRequest,
    ScrapePreviewResponse,
    RobotsCheckRequest,
    RobotsCheckResponse,
)
from app.worker.tasks import execute_scrape_job

router = APIRouter(prefix="/api", tags=["scraping"])


@router.post("/scrape", response_model=ScrapeJobResponse, status_code=201)
async def start_scrape(
    data: ScrapeJobCreate,
    db: AsyncSession = Depends(get_db),
):
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == data.project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create the job
    job = ScrapeJob(
        project_id=data.project_id,
        target_url=data.target_url,
        selectors=data.selectors,
        render_mode=data.render_mode,
        pagination_config=data.pagination_config.model_dump() if data.pagination_config else {},
        headers=data.headers or {},
        cookies=data.cookies or {},
        options=data.options.model_dump() if data.options else {},
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Queue the job via Celery
    execute_scrape_job.delay(str(job.id))

    return ScrapeJobResponse.model_validate(job)


@router.get("/jobs/{job_id}", response_model=ScrapeJobResponse)
async def get_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ScrapeJob).where(ScrapeJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return ScrapeJobResponse.model_validate(job)


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ScrapeJob).where(ScrapeJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in ("pending", "running"):
        raise HTTPException(status_code=400, detail="Job cannot be cancelled in current state")

    job.status = "cancelled"
    await db.commit()

    # Revoke celery task if exists
    if job.celery_task_id:
        from app.worker.celery_app import celery_app
        celery_app.control.revoke(job.celery_task_id, terminate=True)

    return {"message": "Job cancelled successfully"}


@router.post("/jobs/{job_id}/rerun", response_model=ScrapeJobResponse, status_code=201)
async def rerun_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ScrapeJob).where(ScrapeJob.id == job_id))
    old_job = result.scalar_one_or_none()
    if not old_job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Create a new job with the same config
    new_job = ScrapeJob(
        project_id=old_job.project_id,
        target_url=old_job.target_url,
        selectors=old_job.selectors,
        render_mode=old_job.render_mode,
        pagination_config=old_job.pagination_config,
        headers=old_job.headers,
        cookies=old_job.cookies,
        options=old_job.options,
        status="pending",
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    # Queue the new job
    execute_scrape_job.delay(str(new_job.id))

    return ScrapeJobResponse.model_validate(new_job)


@router.post("/preview", response_model=ScrapePreviewResponse)
async def preview_scrape(data: ScrapePreviewRequest):
    """Preview scraping results for a single page (without creating a job)."""
    try:
        if data.render_mode == "dynamic":
            from app.services.dynamic_scraper import dynamic_scraper
            html, final_url = await dynamic_scraper.fetch_page(
                url=data.target_url,
                headers=data.headers,
                cookies=data.cookies,
            )
            items = dynamic_scraper.parse_page(html, data.selectors, final_url)
            title = dynamic_scraper.get_page_title(html)
        else:
            from app.services.static_scraper import static_scraper
            html, final_url = await static_scraper.fetch_page(
                url=data.target_url,
                headers=data.headers,
                cookies=data.cookies,
            )
            items = static_scraper.parse_page(html, data.selectors, final_url)
            title = static_scraper.get_page_title(html)

        return ScrapePreviewResponse(
            success=True,
            data=items[:20],  # Return max 20 items for preview
            page_title=title,
            total_found=len(items),
        )
    except Exception as e:
        return ScrapePreviewResponse(
            success=False,
            error=str(e),
        )


@router.post("/check-robots", response_model=RobotsCheckResponse)
async def check_robots(data: RobotsCheckRequest):
    """Check robots.txt for a given URL."""
    from app.services.robots_checker import robots_checker
    result = await robots_checker.check(data.url)
    return RobotsCheckResponse(**result)
