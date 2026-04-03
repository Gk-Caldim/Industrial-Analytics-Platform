from app.core.database import SessionLocal
from sqlalchemy import text

def add_columns():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE project_sub_categories ADD COLUMN phase VARCHAR;"))
        db.execute(text("ALTER TABLE project_sub_categories ADD COLUMN category VARCHAR;"))
        db.execute(text("ALTER TABLE project_sub_categories ADD COLUMN assigned_employees JSONB DEFAULT '[]'::jsonb;"))
        db.commit()
        print("Successfully added phase, category, and assigned_employees columns to project_sub_categories.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_columns()
