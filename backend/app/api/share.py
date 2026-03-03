import uuid
import math
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.config import settings
from app.models.share_link import ShareLink
from app.models.scrape_job import ScrapeJob
from app.models.scrape_result import ScrapeResult
from app.schemas.share_link import (
    ShareLinkCreate,
    ShareLinkResponse,
    SharedDataResponse,
)

router = APIRouter(prefix="/api", tags=["sharing"])


@router.post("/jobs/{job_id}/share", response_model=ShareLinkResponse, status_code=201)
async def create_share_link(
    job_id: uuid.UUID,
    data: ShareLinkCreate = ShareLinkCreate(),
    db: AsyncSession = Depends(get_db),
):
    # Verify job exists
    result = await db.execute(select(ScrapeJob).where(ScrapeJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    expires_at = None
    if data.ttl_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.ttl_days)

    share = ShareLink(
        job_id=job_id,
        token=secrets.token_urlsafe(32),
        expires_at=expires_at,
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)

    return ShareLinkResponse(
        id=share.id,
        job_id=share.job_id,
        token=share.token,
        expires_at=share.expires_at,
        created_at=share.created_at,
        share_url=f"/share/{share.token}",
    )


@router.get("/share/{token}", response_model=SharedDataResponse)
async def get_shared_data(
    token: str,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
):
    # Find the share link
    result = await db.execute(select(ShareLink).where(ShareLink.token == token))
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    # Check expiration
    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Share link has expired")

    # Get the job
    job_result = await db.execute(select(ScrapeJob).where(ScrapeJob.id == share.job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Associated job not found")

    # Get results with pagination
    count_result = await db.execute(
        select(func.count(ScrapeResult.id)).where(ScrapeResult.job_id == share.job_id)
    )
    total = count_result.scalar() or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    results_query = select(ScrapeResult)\
        .where(ScrapeResult.job_id == share.job_id)\
        .order_by(ScrapeResult.page_number, ScrapeResult.scraped_at)\
        .offset((page - 1) * page_size)\
        .limit(page_size)

    results = await db.execute(results_query)
    items = results.scalars().all()

    return SharedDataResponse(
        job={
            "id": str(job.id),
            "target_url": job.target_url,
            "status": job.status,
            "total_items": job.total_items,
            "total_pages": job.total_pages,
            "duration_seconds": job.duration_seconds,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        },
        results=[
            {
                "id": str(r.id),
                "source_url": r.source_url,
                "data": r.data,
                "page_number": r.page_number,
                "scraped_at": r.scraped_at.isoformat(),
            }
            for r in items
        ],
        total_results=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        expires_at=share.expires_at,
    )


@router.get("/jobs/{job_id}/shares")
async def list_share_links(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ShareLink).where(ShareLink.job_id == job_id).order_by(ShareLink.created_at.desc())
    )
    shares = result.scalars().all()

    return {
        "items": [
            ShareLinkResponse(
                id=s.id,
                job_id=s.job_id,
                token=s.token,
                expires_at=s.expires_at,
                created_at=s.created_at,
                share_url=f"/share/{s.token}",
            )
            for s in shares
        ],
        "total": len(shares),
    }


@router.delete("/share/{share_id}", status_code=204)
async def delete_share_link(
    share_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ShareLink).where(ShareLink.id == share_id))
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")

    await db.delete(share)
    await db.commit()
