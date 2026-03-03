from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base

# Import all models so they are registered with SQLAlchemy
from app.models.project import Project
from app.models.scrape_job import ScrapeJob
from app.models.scrape_result import ScrapeResult, JobLog
from app.models.share_link import ShareLink
from app.models.schedule import Schedule

# Import routers
from app.api.projects import router as projects_router
from app.api.scrape import router as scrape_router
from app.api.results import router as results_router
from app.api.share import router as share_router
from app.api.schedule import router as schedule_router
from app.api.websocket import router as websocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup on shutdown
    await engine.dispose()


app = FastAPI(
    title="ScrapePilot",
    description="Production-grade web scraping studio with real-time monitoring, job scheduling, and data export.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects_router)
app.include_router(scrape_router)
app.include_router(results_router)
app.include_router(share_router)
app.include_router(schedule_router)
app.include_router(websocket_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "ScrapePilot API", "version": "1.0.0"}
