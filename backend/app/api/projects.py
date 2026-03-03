import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional

from app.database import get_db
from app.models.project import Project
from app.models.scrape_job import ScrapeJob
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Project)
    count_query = select(func.count(Project.id))

    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))
        count_query = count_query.where(Project.name.ilike(f"%{search}%"))

    total = (await db.execute(count_query)).scalar()
    query = query.order_by(desc(Project.updated_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    projects = result.scalars().all()

    items = []
    for p in projects:
        # Get job count and last run
        job_count_result = await db.execute(
            select(func.count(ScrapeJob.id)).where(ScrapeJob.project_id == p.id)
        )
        job_count = job_count_result.scalar() or 0

        last_run_result = await db.execute(
            select(ScrapeJob.created_at)
            .where(ScrapeJob.project_id == p.id)
            .order_by(desc(ScrapeJob.created_at))
            .limit(1)
        )
        last_run = last_run_result.scalar()

        items.append(ProjectResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            created_at=p.created_at,
            updated_at=p.updated_at,
            job_count=job_count,
            last_run_at=last_run,
        ))

    return ProjectListResponse(items=items, total=total)


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
):
    project = Project(name=data.name, description=data.description)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        created_at=project.created_at,
        updated_at=project.updated_at,
        job_count=0,
        last_run_at=None,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    job_count_result = await db.execute(
        select(func.count(ScrapeJob.id)).where(ScrapeJob.project_id == project.id)
    )
    job_count = job_count_result.scalar() or 0

    last_run_result = await db.execute(
        select(ScrapeJob.created_at)
        .where(ScrapeJob.project_id == project.id)
        .order_by(desc(ScrapeJob.created_at))
        .limit(1)
    )
    last_run = last_run_result.scalar()

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        created_at=project.created_at,
        updated_at=project.updated_at,
        job_count=job_count,
        last_run_at=last_run,
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description

    await db.commit()
    await db.refresh(project)

    job_count_result = await db.execute(
        select(func.count(ScrapeJob.id)).where(ScrapeJob.project_id == project.id)
    )
    job_count = job_count_result.scalar() or 0

    last_run_result = await db.execute(
        select(ScrapeJob.created_at)
        .where(ScrapeJob.project_id == project.id)
        .order_by(desc(ScrapeJob.created_at))
        .limit(1)
    )
    last_run = last_run_result.scalar()

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        created_at=project.created_at,
        updated_at=project.updated_at,
        job_count=job_count,
        last_run_at=last_run,
    )


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()
