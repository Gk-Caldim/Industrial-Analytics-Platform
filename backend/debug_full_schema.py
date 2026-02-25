from app.core.database import engine
from sqlalchemy import inspect

def check_full_schema():
    inspector = inspect(engine)
    for table in ['datasets', 'dataset_rows', 'dataset_columns']:
        try:
            columns = inspector.get_columns(table)
            print(f"\nColumns in '{table}' table:")
            for col in columns:
                print(f"- {col['name']} ({col['type']})")
        except Exception as e:
            print(f"\nCould not get schema for {table}: {e}")

if __name__ == "__main__":
    check_full_schema()
