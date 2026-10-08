from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.curriculum import router as curriculum_router
from app.api.health import router as health_router
from app.api.materials import router as material_router
from app.api.assessment import router as assessment_router
from app.api.ai import router as ai_router
from app.api.learning_plan import router as learning_plan_router
from app.api.progress import router as progress_router
from app.api.skills import router as skills_router
from app.core.config import get_settings
from app.db.database import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MVP: Adaptive Learning Loop Routers ---
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(curriculum_router)
app.include_router(material_router)
app.include_router(assessment_router)
app.include_router(ai_router)
app.include_router(learning_plan_router)
app.include_router(progress_router)
app.include_router(skills_router)

# --- Institutional / Compatibility Routers ---
from app.api.teacher import router as teacher_router
from app.api.classroom import router as classroom_router
from app.api.platform_admin import router as platform_admin_router
from app.api.college_admin import router as college_admin_router

app.include_router(teacher_router)
app.include_router(classroom_router)
app.include_router(platform_admin_router)
app.include_router(college_admin_router)

# --- /api alias routes (for frontend compatibility, hidden from docs) ---
app.include_router(auth_router, prefix="/api", include_in_schema=False)
app.include_router(material_router, prefix="/api", include_in_schema=False)
app.include_router(curriculum_router, prefix="/api", include_in_schema=False)
app.include_router(assessment_router, prefix="/api", include_in_schema=False)
app.include_router(ai_router, prefix="/api", include_in_schema=False)
app.include_router(learning_plan_router, prefix="/api", include_in_schema=False)
app.include_router(progress_router, prefix="/api", include_in_schema=False)
app.include_router(skills_router, prefix="/api", include_in_schema=False)
app.include_router(teacher_router, prefix="/api", include_in_schema=False)
app.include_router(classroom_router, prefix="/api", include_in_schema=False)
app.include_router(platform_admin_router, prefix="/api", include_in_schema=False)
app.include_router(college_admin_router, prefix="/api", include_in_schema=False)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "message": "EduPlanner Adaptive Learning API v2.0",
        "health": "/health",
        "docs": "/docs",
    }
