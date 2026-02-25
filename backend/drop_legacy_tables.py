from app.core.database import engine
from sqlalchemy import text

def drop_tables():
    with engine.connect() as conn:
        try:
            # Drop in order of dependencies
            conn.execute(text("DROP TABLE IF EXISTS dataset_rows CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS dataset_columns CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS datasets CASCADE"))
            conn.commit()
            print("Tables dropped successfully.")
        except Exception as e:
            print(f"Error dropping tables: {e}")

if __name__ == "__main__":
    drop_tables()
