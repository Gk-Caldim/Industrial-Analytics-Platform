from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import DATABASE_URL

# Create engine (SAFE for Supabase transaction pooler on port 6543)
# We MUST use NullPool here so SQLAlchemy doesn't keep a local pool of connections
# which would conflict with Supabase's own PgBouncer transaction pooler.
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,
    connect_args={
        "sslmode": "require",
        "options": "-c statement_cache_size=0",  # DISABLE prepared statements for Supabase transaction pool
    },
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

# FastAPI dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
