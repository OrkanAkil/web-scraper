from celery import Celery
from app.config import settings

celery_app = Celery(
    "scrapepilot",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    broker_connection_retry_on_startup=True,
    # Beat schedule for periodic tasks
    beat_schedule={
        "check-scheduled-jobs": {
            "task": "app.worker.tasks.check_scheduled_jobs",
            "schedule": 60.0,  # Every 60 seconds
        },
    },
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.worker"])
