import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

def add_column():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE budget_summaries ADD COLUMN currency VARCHAR DEFAULT '$'"))
        print("Successfully added currency column to budget_summaries")
    except Exception as e:
        print(f"Migration error or column already exists: {e}")

if __name__ == "__main__":
    add_column()
