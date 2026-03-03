import asyncio
import time
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from urllib.parse import urlparse

import redis
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.services.static_scraper import StaticScraper
from app.services.robots_checker import RobotsChecker

# Import all models so SQLAlchemy can resolve all relationship() references
from sqlalchemy.orm import configure_mappers
from app.models.project import Project  # noqa: F401
from app.models.scrape_job import ScrapeJob as _ScrapeJob  # noqa: F401
from app.models.scrape_result import ScrapeResult as _ScrapeResult, JobLog as _JobLog  # noqa: F401
from app.models.share_link import ShareLink  # noqa: F401
from app.models.schedule import Schedule  # noqa: F401
configure_mappers()


# Sync database for Celery workers
sync_engine = create_engine(settings.SYNC_DATABASE_URL, pool_pre_ping=True)
SyncSession = sessionmaker(bind=sync_engine)

# Redis for pub/sub logs
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def publish_log(job_id: str, level: str, message: str):
    """Publish a log message to Redis pub/sub and store in DB."""
    log_entry = {
        "id": str(uuid.uuid4()),
        "job_id": str(job_id),
        "level": level,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    redis_client.publish(f"job_logs:{job_id}", json.dumps(log_entry))

    # Also persist to database
    from app.models.scrape_result import JobLog
    session = SyncSession()
    try:
        log = JobLog(
            id=uuid.UUID(log_entry["id"]),
            job_id=uuid.UUID(str(job_id)),
            level=level,
            message=message,
        )
        session.add(log)
        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()


def run_scrape_job(job_id: str):
    """Main synchronous scraping orchestrator called by Celery worker."""
    from app.models.scrape_job import ScrapeJob
    from app.models.scrape_result import ScrapeResult

    session = SyncSession()

    try:
        job = session.query(ScrapeJob).filter(ScrapeJob.id == uuid.UUID(job_id)).first()
        if not job:
            publish_log(job_id, "ERROR", f"Job {job_id} not found")
            return

        # Update status to running
        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        session.commit()

        publish_log(job_id, "INFO", f"Starting scrape job for {job.target_url}")

        # Extract configuration
        selectors = job.selectors or {}
        render_mode = job.render_mode or "static"
        pagination_config = job.pagination_config or {}
        headers = job.headers or {}
        cookies = job.cookies or {}
        options = job.options or {}

        rate_limit_ms = options.get("rate_limit_ms", settings.DEFAULT_RATE_LIMIT_MS)
        max_retries = options.get("max_retries", settings.DEFAULT_MAX_RETRIES)
        timeout = options.get("timeout_seconds", settings.DEFAULT_TIMEOUT_SECONDS)
        user_agent = options.get("user_agent") or settings.DEFAULT_USER_AGENT
        respect_robots = options.get("respect_robots_txt", True)
        wait_for_selector = options.get("wait_for_selector")
        wait_timeout_ms = options.get("wait_timeout_ms", 10000)

        # Pagination config
        pagination_enabled = pagination_config.get("enabled", False)
        pagination_type = pagination_config.get("type", "next_button")
        next_selector = pagination_config.get("next_selector", "")
        max_pages = pagination_config.get("max_pages", settings.DEFAULT_MAX_PAGES)
        wait_after_scroll_ms = pagination_config.get("wait_after_scroll_ms", 2000)

        # Check robots.txt
        if respect_robots:
            publish_log(job_id, "INFO", "Checking robots.txt...")
            robots_result = _sync_check_robots(job.target_url, user_agent)
            if not robots_result["allowed"]:
                publish_log(job_id, "WARNING", f"robots.txt disallows scraping: {robots_result['details']}")
                # Continue anyway but log the warning

        # Start scraping
        start_time = time.time()
        current_url = job.target_url
        page_number = 1
        total_items = 0
        all_results = []

        while current_url and page_number <= max_pages:
            publish_log(job_id, "INFO", f"Scraping page {page_number}: {current_url}")

            # Check if job was cancelled
            session.refresh(job)
            if job.status == "cancelled":
                publish_log(job_id, "INFO", "Job cancelled by user")
                break

            try:
                html, final_url = _sync_fetch_page(
                    url=current_url,
                    render_mode=render_mode,
                    headers=headers,
                    cookies=cookies,
                    timeout=timeout,
                    user_agent=user_agent,
                    wait_for_selector=wait_for_selector,
                    wait_timeout_ms=wait_timeout_ms,
                    pagination_type=pagination_type if pagination_enabled else None,
                    scroll_count=max_pages - page_number + 1 if pagination_type == "infinite_scroll" else 0,
                    wait_after_scroll_ms=wait_after_scroll_ms,
                )
            except Exception as e:
                error_msg = f"Failed to fetch page {page_number}: {str(e)}"
                publish_log(job_id, "ERROR", error_msg)

                # Retry logic
                retried = False
                for retry in range(max_retries):
                    wait_time = (2 ** retry)
                    publish_log(job_id, "WARNING", f"Retrying in {wait_time}s (attempt {retry + 1}/{max_retries})")
                    time.sleep(wait_time)
                    try:
                        html, final_url = _sync_fetch_page(
                            url=current_url,
                            render_mode=render_mode,
                            headers=headers,
                            cookies=cookies,
                            timeout=timeout,
                            user_agent=user_agent,
                            wait_for_selector=wait_for_selector,
                            wait_timeout_ms=wait_timeout_ms,
                        )
                        retried = True
                        publish_log(job_id, "INFO", f"Retry successful on attempt {retry + 1}")
                        break
                    except Exception as retry_err:
                        publish_log(job_id, "ERROR", f"Retry {retry + 1} failed: {str(retry_err)}")

                if not retried:
                    publish_log(job_id, "ERROR", f"All retries exhausted for page {page_number}")
                    if page_number == 1:
                        job.status = "failed"
                        job.error_message = error_msg
                        job.completed_at = datetime.now(timezone.utc)
                        job.duration_seconds = time.time() - start_time
                        session.commit()
                        return
                    break

            # Parse the page
            scraper = StaticScraper()
            items = scraper.parse_page(html, selectors, final_url)
            publish_log(job_id, "INFO", f"Found {len(items)} items on page {page_number}")

            # Store results
            for item_data in items:
                result = ScrapeResult(
                    job_id=job.id,
                    source_url=final_url,
                    data=item_data,
                    page_number=page_number,
                )
                session.add(result)
                total_items += 1

            # Update progress
            job.scraped_pages = page_number
            job.total_items = total_items
            session.commit()

            # Handle pagination
            if pagination_enabled and pagination_type != "infinite_scroll":
                if next_selector:
                    next_url = scraper.find_next_page(html, next_selector, final_url)
                    if next_url and next_url != current_url:
                        current_url = next_url
                        page_number += 1
                        # Rate limit between pages
                        time.sleep(rate_limit_ms / 1000.0)
                        continue
                break
            else:
                break

        # Complete the job
        duration = time.time() - start_time
        job.status = "completed"
        job.total_pages = page_number
        job.total_items = total_items
        job.duration_seconds = round(duration, 2)
        job.completed_at = datetime.now(timezone.utc)
        session.commit()

        publish_log(job_id, "INFO", f"Scraping completed: {total_items} items from {page_number} pages in {round(duration, 1)}s")

    except Exception as e:
        publish_log(job_id, "ERROR", f"Job failed with error: {str(e)}")
        try:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            session.commit()
        except Exception:
            session.rollback()
    finally:
        session.close()


def _sync_fetch_page(
    url: str,
    render_mode: str = "static",
    headers=None,
    cookies=None,
    timeout=30,
    user_agent="ScrapePilot/1.0",
    wait_for_selector=None,
    wait_timeout_ms=10000,
    pagination_type=None,
    scroll_count=0,
    wait_after_scroll_ms=2000,
):
    """Synchronous wrapper around async scraping functions."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        if render_mode == "dynamic":
            from app.services.dynamic_scraper import DynamicScraper
            scraper = DynamicScraper()
            if pagination_type == "infinite_scroll" and scroll_count > 0:
                return loop.run_until_complete(
                    scraper.fetch_page_with_scroll(
                        url=url,
                        scroll_count=scroll_count,
                        wait_after_scroll_ms=wait_after_scroll_ms,
                        headers=headers,
                        cookies=cookies,
                        timeout=timeout,
                        user_agent=user_agent,
                        wait_for_selector=wait_for_selector,
                        wait_timeout_ms=wait_timeout_ms,
                    )
                )
            return loop.run_until_complete(
                scraper.fetch_page(
                    url=url,
                    headers=headers,
                    cookies=cookies,
                    timeout=timeout,
                    user_agent=user_agent,
                    wait_for_selector=wait_for_selector,
                    wait_timeout_ms=wait_timeout_ms,
                )
            )
        else:
            from app.services.static_scraper import StaticScraper
            scraper = StaticScraper()
            return loop.run_until_complete(
                scraper.fetch_page(
                    url=url,
                    headers=headers,
                    cookies=cookies,
                    timeout=timeout,
                    user_agent=user_agent,
                )
            )
    finally:
        loop.close()


def _sync_check_robots(url: str, user_agent: str = "*") -> dict:
    """Synchronous wrapper for robots.txt checking."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        checker = RobotsChecker()
        return loop.run_until_complete(checker.check(url, user_agent))
    finally:
        loop.close()
