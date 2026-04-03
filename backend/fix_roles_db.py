import sys
import os

sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from app.core.database import engine

def main():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_default INTEGER DEFAULT 0;"))
        print("Successfully added is_default column to roles table.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
