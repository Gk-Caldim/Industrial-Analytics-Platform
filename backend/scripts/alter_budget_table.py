import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.core.database import SessionLocal

def alter_table():
    db = SessionLocal()
    try:
        db.execute(text('ALTER TABLE budget_summaries ADD COLUMN IF NOT EXISTS attachment_data BYTEA;'))
        db.execute(text('ALTER TABLE budget_summaries ADD COLUMN IF NOT EXISTS attachment_name VARCHAR;'))
        db.execute(text('ALTER TABLE budget_summaries ADD COLUMN IF NOT EXISTS attachment_type VARCHAR;'))
        db.commit()
        print('Success')
    except Exception as e:
        db.rollback()
        print('Error:', e)
    finally:
        db.close()

if __name__ == '__main__':
    alter_table()
