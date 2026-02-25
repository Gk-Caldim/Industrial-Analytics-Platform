import time
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://..." # I don't know the URL. I can import it from app.core.config

def main():
    from app.core.config import DATABASE_URL
    engine = create_engine(DATABASE_URL)
    
    start = time.time()
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print(f"Connection and query took {time.time() - start:.3f} seconds")

if __name__ == "__main__":
    main()
