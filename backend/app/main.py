import os
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging
import traceback

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.core.database import engine, Base, get_db
from app.core.config import FRONTEND_URL, API_PREFIX
from app.middleware.logging_middleware import ForbiddenLoggingMiddleware

# Import models for table creation
from app.models import user  # noqa: F401
from app.models import employee  # noqa: F401
from app.models import employee_column  # noqa: F401
from app.models import project  # noqa: F401
from app.models import upload_tracker # noqa: F401
from app.models import budget # noqa: F401
from app.models import project_sub_category # noqa: F401
from app.models import meeting # noqa: F401
from app.models import user_session # noqa: F401
from app.models import settings # noqa: F401
from app.models import google_token  # noqa: F401  ← registers google_tokens table
from app.models.role import Role  # noqa: F401
from app.models import employee_project # noqa: F401
from app.models import project_permission # noqa: F401
from app.models import audit_log # noqa: F401

# Import routers
from app.api.auth import router as auth_router
from app.api.employees import router as employee_router
from app.api.employees import router as employee_router
from app.api import project as project_router
from app.api import department as department_router
from app.api.datasets import router as datasets_router
from app.api.email import router as email_router  # Added email router
from app.api import budget as budget_router
from app.api.project_sub_category import router as sub_category_router
from app.api.settings import router as settings_router
from app.api.roles import router as role_router
from app.api.meetings import router as meetings_router
from app.api.project_team import router as project_team_router
from app.api.audit_logs import router as audit_logs_router
from app.api.teams import router as teams_router
from app.api.application_access import router as application_access_router
from app.crud.role import seed_default_roles

Base.metadata.create_all(bind=engine)
app = FastAPI(
    title="MyFastAPIApp",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
    db = next(get_db())
    try:
        seed_default_roles(db)
    finally:
        db.close()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"Unhandled Exception: {str(exc)}\n{traceback.format_exc()}"
    logger.error(error_msg)
    
    # Return a JSON response with CORS headers if possible
    response = JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)}
    )
    # Re-apply CORS headers manually because middleware might be skipped on crash
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# CORS
origins = [
    "https://automated-manufacturing.vercel.app",   
    "https://automated-manufact-git-6ff091-gokulakrishnans-projects-78c7d2dd.vercel.app",  # preview
    "https://automated-manufacturing-kdmeekg5b.vercel.app", 
    "http://localhost:5173",  # local frontend testing
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if FRONTEND_URL and FRONTEND_URL not in origins:
    origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(employee_router, prefix=API_PREFIX)
app.include_router(project_router.router, prefix=API_PREFIX)
app.include_router(department_router.router, prefix=API_PREFIX)
app.include_router(datasets_router, prefix=API_PREFIX)
app.include_router(email_router, prefix=f"{API_PREFIX}/email", tags=["Email"]) # Added email route
app.include_router(budget_router.router, prefix=f"{API_PREFIX}/budget", tags=["Budget"])
app.include_router(sub_category_router, prefix=API_PREFIX)
app.include_router(settings_router, prefix=API_PREFIX)
app.include_router(role_router, prefix=API_PREFIX)
app.include_router(meetings_router, prefix="/api/meetings", tags=["Meetings"])
app.include_router(project_team_router, prefix=API_PREFIX)
app.include_router(audit_logs_router, prefix=API_PREFIX)
app.include_router(teams_router)  # prefix already set to /api/teams inside the router
app.include_router(application_access_router, prefix=API_PREFIX)

# Static Files
UPLOAD_DIR = "static/uploads/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


#testing routes
@app.get("/test-db")
async def test_db(db=Depends(get_db)): 
    from sqlalchemy import text
    try:
        result = db.execute(text("SELECT 1"))
        return {"status": "ok", "result": result.scalar()}
    except Exception as e:
        logger.error(f"Database test failed: {str(e)}")
        return {"status": "error", "detail": str(e)}

@app.get("/healthz")
def health_check():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Backend is running successfully  - Welcome to the Industrial Analytics Platform API"}