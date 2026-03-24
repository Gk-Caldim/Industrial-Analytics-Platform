from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.core.database import engine, Base, get_db
from app.core.config import FRONTEND_URL, API_PREFIX

# Import models for table creation
from app.models import user  # noqa: F401
from app.models import employee  # noqa: F401
from app.models import employee_column  # noqa: F401
from app.models import project  # noqa: F401
from app.models import part # noqa: F401
from app.models import part_column # noqa: F401
from app.models import upload_tracker # noqa: F401
from app.models import budget # noqa: F401

# Import routers
from app.api.auth import router as auth_router
from app.api.employees import router as employee_router
from app.api.employee_access import router as employee_access_router
from app.api import part as part_router
from app.api import project as project_router
from app.api import department as department_router
from app.api.datasets import router as datasets_router
from app.api.email import router as email_router  # Added email router
from app.api import budget as budget_router

Base.metadata.create_all(bind=engine)
app = FastAPI(
    title="MyFastAPIApp",
    version="1.0.0",
    #lifespan=lifespan,
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation Error: {exc.errors()}")
    try:
        body = await request.json()
        logger.error(f"Request Body: {body}")
    except Exception:
        logger.error("Could not read request body")
        
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc.body)},
    )

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
app.include_router(employee_access_router, prefix=API_PREFIX)
app.include_router(part_router.router, prefix=API_PREFIX)
app.include_router(project_router.router, prefix=API_PREFIX)
app.include_router(department_router.router, prefix=API_PREFIX)
app.include_router(datasets_router, prefix=API_PREFIX)
app.include_router(email_router, prefix=f"{API_PREFIX}/email", tags=["Email"]) # Added email route
app.include_router(budget_router.router, prefix=f"{API_PREFIX}/budget", tags=["Budget"])

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