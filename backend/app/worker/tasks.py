import uuid
from datetime import datetime, timezone
from croniter import croniter
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.worker.celery_app import celery_app
from app.config import settings

# Import all models so SQLAlchemy can resolve all relationship() references
# and call configure_mappers() so relationships are resolved before fork
from sqlalchemy.orm import configure_mappers
from app.models.project import Project  # noqa: F401
from app.models.scrape_job import ScrapeJob as _ScrapeJob  # noqa: F401
from app.models.scrape_result import ScrapeResult, JobLog  # noqa: F401
from app.models.share_link import ShareLink  # noqa: F401
from app.models.schedule import Schedule as _Schedule  # noqa: F401
configure_mappers()


# Sync database session for celery tasks
sync_engine = create_engine(settings.SYNC_DATABASE_URL, pool_pre_ping=True)
SyncSession = sessionmaker(bind=sync_engine)


@celery_app.task(name="app.worker.tasks.execute_scrape_job", bind=True, max_retries=0)
def execute_scrape_job(self, job_id: str):
    """Execute a scraping job."""
    from sqlalchemy.orm import configure_mappers
    from app.models.project import Project  # noqa: F401
    from app.models.scrape_result import ScrapeResult, JobLog  # noqa: F401
    from app.models.share_link import ShareLink  # noqa: F401
    from app.models.schedule import Schedule  # noqa: F401
    configure_mappers()
    from app.services.scraper import run_scrape_job, publish_log

    publish_log(job_id, "INFO", f"Celery task started: {self.request.id}")

    # Store the celery task ID in the job
    from app.models.scrape_job import ScrapeJob
    session = SyncSession()
    try:
        job = session.query(ScrapeJob).filter(ScrapeJob.id == uuid.UUID(job_id)).first()
        if job:
            job.celery_task_id = self.request.id
            session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()

    # Run the actual scraping
    run_scrape_job(job_id)


@celery_app.task(name="app.worker.tasks.check_scheduled_jobs")
def check_scheduled_jobs():
    """Periodic task to check and run scheduled scraping jobs."""
    from sqlalchemy.orm import configure_mappers
    from app.models.project import Project  # noqa: F401
    from app.models.scrape_result import ScrapeResult, JobLog  # noqa: F401
    from app.models.share_link import ShareLink  # noqa: F401
    from app.models.schedule import Schedule
    from app.models.scrape_job import ScrapeJob
    configure_mappers()

    session = SyncSession()
    try:
        now = datetime.now(timezone.utc)
        schedules = session.query(Schedule).filter(
            Schedule.is_active == True,
            Schedule.next_run_at <= now,
        ).all()

        for schedule in schedules:
            # Create a new scrape job from the schedule template
            job = ScrapeJob(
                project_id=schedule.project_id,
                target_url=schedule.target_url,
                selectors=schedule.selectors,
                render_mode=schedule.render_mode,
                pagination_config=schedule.pagination_config or {},
                options=schedule.options or {},
                status="pending",
            )
            session.add(job)
            session.flush()

            # Update schedule
            schedule.last_job_id = job.id
            cron = croniter(schedule.cron_expression, now)
            schedule.next_run_at = cron.get_next(datetime)

            session.commit()

            # Queue the job
            execute_scrape_job.delay(str(job.id))

    except Exception as e:
        session.rollback()
        print(f"Error checking scheduled jobs: {e}")
    finally:
        session.close()
